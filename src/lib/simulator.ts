'use client';

/**
 * EVDx Simulator Engine
 *
 * A multi-brand driving & charging simulator that produces realistic
 * EV telemetry data for demo and testing purposes.
 *
 * Supported brands: BYD (LFP), Tesla (NCA), Nissan (NMC), Hyundai/Kia (NCM),
 * VW Group (NMC), and a generic fallback profile.
 *
 * Design principles:
 *  - 100 ms internal tick, 500 ms store push interval
 *  - Chemistry-aware voltage models (LFP flat, NCA tapered, NMC moderate)
 *  - Brand-specific thermal behaviour
 *  - Deterministic driving phase state machine with random transitions
 *  - Pluggable charging simulation (DC fast / AC L2 / AC L1)
 *  - Eco-score calculation from driving behaviour
 */

import { useAppStore } from './store';
import type { DTCEvent, VehicleProfile } from './types';

// ─── Brand Profiles ───────────────────────────────────────────────────────────

type Chemistry = 'LFP' | 'NCA' | 'NMC' | 'NCM';

interface BrandParams {
  /** Nominal battery capacity kWh */
  capacity: number;
  /** Battery chemistry */
  chemistry: Chemistry;
  /** Pack nominal voltage V */
  nominalVoltage: number;
  /** Cell nominal voltage mV */
  cellNominalV: number;
  /** Cell max voltage mV (100 % SOC) */
  cellMaxV: number;
  /** Cell min voltage mV (0 % SOC) */
  cellMinV: number;
  /** Typical cell delta at mid-SOC mV (LFP is tighter) */
  typicalCellDelta: number;
  /** Number of cells (approximate) */
  cellCount: number;
  /** Max DC charge power kW */
  dcChargeMax: number;
  /** Max AC charge power kW */
  acChargeMax: number;
  /** Thermal management quality: lower = better cooling */
  thermalCoeff: number;
  /** WLTP range km (used to derive range from SOC) */
  wltpRange: number;
  /** Max motor power kW */
  maxMotorPower: number;
  /** DTC code prefixes specific to brand */
  dtcPrefixes: string[];
}

const BRAND_PROFILES: Record<string, BrandParams> = {
  byd: {
    capacity: 60,
    chemistry: 'LFP',
    nominalVoltage: 512,
    cellNominalV: 3200,
    cellMaxV: 3650,
    cellMinV: 2500,
    typicalCellDelta: 8,
    cellCount: 160,
    dcChargeMax: 150,
    acChargeMax: 11,
    thermalCoeff: 0.035,
    wltpRange: 420,
    maxMotorPower: 150,
    dtcPrefixes: ['P11', 'P12', 'U01', 'U11', 'B12'],
  },
  tesla: {
    capacity: 75,
    chemistry: 'NCA',
    nominalVoltage: 350,
    cellNominalV: 3600,
    cellMaxV: 4200,
    cellMinV: 2950,
    typicalCellDelta: 25,
    cellCount: 96,
    dcChargeMax: 250,
    acChargeMax: 19.2,
    thermalCoeff: 0.02,
    wltpRange: 560,
    maxMotorPower: 258,
    dtcPrefixes: ['P0A', 'P0B', 'U00', 'U01', 'B10'],
  },
  nissan: {
    capacity: 40,
    chemistry: 'NMC',
    nominalVoltage: 360,
    cellNominalV: 3700,
    cellMaxV: 4100,
    cellMinV: 3000,
    typicalCellDelta: 30,
    cellCount: 96,
    dcChargeMax: 130,
    acChargeMax: 7.4,
    thermalCoeff: 0.045,
    wltpRange: 270,
    maxMotorPower: 110,
    dtcPrefixes: ['P0A', 'P0B', 'P31', 'U10'],
  },
  'hyundai-kia': {
    capacity: 77,
    chemistry: 'NCM',
    nominalVoltage: 396,
    cellNominalV: 3650,
    cellMaxV: 4150,
    cellMinV: 2900,
    typicalCellDelta: 22,
    cellCount: 108,
    dcChargeMax: 350,
    acChargeMax: 11,
    thermalCoeff: 0.025,
    wltpRange: 480,
    maxMotorPower: 239,
    dtcPrefixes: ['P0A', 'P0B', 'P0C', 'U01', 'B14'],
  },
  'vw-group': {
    capacity: 77,
    chemistry: 'NMC',
    nominalVoltage: 403,
    cellNominalV: 3700,
    cellMaxV: 4180,
    cellMinV: 2960,
    typicalCellDelta: 28,
    cellCount: 108,
    dcChargeMax: 270,
    acChargeMax: 22,
    thermalCoeff: 0.03,
    wltpRange: 460,
    maxMotorPower: 210,
    dtcPrefixes: ['P0A', 'P0B', 'P15', 'U00', 'U04'],
  },
  generic: {
    capacity: 60,
    chemistry: 'NMC',
    nominalVoltage: 355,
    cellNominalV: 3600,
    cellMaxV: 4100,
    cellMinV: 3000,
    typicalCellDelta: 20,
    cellCount: 96,
    dcChargeMax: 100,
    acChargeMax: 11,
    thermalCoeff: 0.04,
    wltpRange: 350,
    maxMotorPower: 150,
    dtcPrefixes: ['P0A', 'P0B', 'U00'],
  },
};

// ─── Driving Phase ────────────────────────────────────────────────────────────

type DrivingPhase =
  | 'stationary'
  | 'accelerating'
  | 'cruising'
  | 'decelerating'
  | 'regen_braking'
  | 'city_driving';

interface SimState {
  speed: number;             // km/h (smoothed)
  targetSpeed: number;       // km/h (phase target)
  phase: DrivingPhase;
  phaseTimer: number;        // ms remaining in current phase
  soc: number;               // 0-100
  batteryTemp: number;       // °C
  motorTemp: number;         // °C
  inverterTemp: number;      // °C
  coolantInlet: number;      // °C
  coolantOutlet: number;     // °C
  tripDistance: number;       // m
  tripEnergy: number;         // Wh consumed
  tripRegen: number;          // Wh recovered
  tripMaxSpeed: number;       // km/h
  tripDuration: number;       // ms
  odometer: number;           // km
  acceleratorPedal: number;   // 0-100 %
  isCharging: boolean;
  chargeType: 'dc_fast' | 'ac_l2' | 'ac_l1';
  chargeEnergyAdded: number;  // kWh
  chargeStartSoc: number;     // %
  ecoAccelScore: number;      // 0-100 running average
  ecoBrakeScore: number;
  ecoSpeedScore: number;
  ecoEffScore: number;
  ecoSamples: number;
}

// ─── Simulator Engine ─────────────────────────────────────────────────────────

export class SimulatorEngine {
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private pushInterval: ReturnType<typeof setInterval> | null = null;
  private sim: SimState;
  private brand: BrandParams;
  private vehicle: VehicleProfile | null;
  private tickCount = 0;

  constructor() {
    this.vehicle = null;
    this.brand = BRAND_PROFILES.generic;
    this.sim = this.createDefaultSimState();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Start the simulation loop */
  start(): void {
    this.stop(); // clear any existing loop
    this.vehicle = useAppStore.getState().activeVehicle;
    this.brand = this.resolveBrand(this.vehicle);
    this.sim = this.createDefaultSimState();
    this.sim.odometer = useAppStore.getState().vehicleData.odometer;
    this.sim.soc = useAppStore.getState().vehicleData.soc || 75;

    // 100 ms tick: physics & state machine
    this.tickInterval = setInterval(() => this.tick(), 100);
    // 500 ms push: write batched updates to the Zustand store
    this.pushInterval = setInterval(() => this.pushToStore(), 500);
  }

  /** Stop the simulation loop */
  stop(): void {
    if (this.tickInterval) clearInterval(this.tickInterval);
    if (this.pushInterval) clearInterval(this.pushInterval);
    this.tickInterval = null;
    this.pushInterval = null;
  }

  /** Inject a diagnostic trouble code for demo / testing */
  injectFault(code: string): void {
    const prefix = code.substring(0, 3).toUpperCase();
    const isBrandMatch = this.brand.dtcPrefixes.some((p) => prefix.startsWith(p));
    const severity = isBrandMatch ? 'high' : 'medium';
    const dtc: DTCEvent = {
      code,
      description: this.describeDTC(code),
      severity,
      timestamp: Date.now(),
      active: true,
      count: 1,
    };
    useAppStore.getState().addDTC(dtc);
    useAppStore.getState().setMilOn(true);
  }

  /** Force the simulator into a specific driving phase */
  setPhase(phase: DrivingPhase): void {
    this.sim.phase = phase;
    this.assignPhaseTarget(phase);
  }

  /** Force the simulator into charging mode */
  startCharging(type: 'dc_fast' | 'ac_l2' | 'ac_l1'): void {
    this.sim.isCharging = true;
    this.sim.chargeType = type;
    this.sim.chargeStartSoc = this.sim.soc;
    this.sim.chargeEnergyAdded = 0;
    this.sim.phase = 'stationary';
    this.sim.speed = 0;
    this.sim.targetSpeed = 0;
  }

  /** Stop charging and return to driving */
  stopCharging(): void {
    this.sim.isCharging = false;
  }

  // ── Tick (100 ms) ───────────────────────────────────────────────────────────

  private tick(): void {
    this.tickCount++;

    if (this.sim.isCharging) {
      this.tickCharging();
    } else {
      this.tickDriving();
    }

    this.tickTemperatures();
    this.tickEcoScore();
  }

  // ── Driving Simulation ──────────────────────────────────────────────────────

  private tickDriving(): void {
    const dt = 0.1; // 100 ms in seconds

    // Phase state machine
    this.sim.phaseTimer -= 100;
    if (this.sim.phaseTimer <= 0) {
      this.transitionPhase();
    }

    // Smooth speed towards target
    const accelRate = this.sim.phase === 'accelerating' ? 18
      : this.sim.phase === 'regen_braking' ? -22
      : this.sim.phase === 'decelerating' ? -10
      : this.sim.phase === 'city_driving' ? (Math.random() > 0.5 ? 8 : -6)
      : 0; // stationary / cruising

    const speedDelta = accelRate * dt + (Math.random() - 0.5) * 2;
    this.sim.speed = Math.max(0, Math.min(200, this.sim.speed + speedDelta));

    // Clamp to target range
    if (this.sim.phase === 'cruising') {
      const diff = this.sim.targetSpeed - this.sim.speed;
      this.sim.speed += diff * 0.05;
    }
    if (this.sim.phase === 'stationary') {
      this.sim.speed *= 0.92; // coast to stop
    }

    // Accelerator pedal
    if (this.sim.phase === 'accelerating' || this.sim.phase === 'city_driving') {
      this.sim.acceleratorPedal = Math.min(100, 30 + this.sim.speed * 0.4 + Math.random() * 15);
    } else if (this.sim.phase === 'regen_braking') {
      this.sim.acceleratorPedal = 0;
    } else if (this.sim.phase === 'decelerating') {
      this.sim.acceleratorPedal = Math.random() * 5;
    } else {
      this.sim.acceleratorPedal = this.sim.speed > 2 ? 8 + Math.random() * 5 : 0;
    }

    // Power draw (kW)
    const motorEff = 0.92;
    const speedMs = this.sim.speed / 3.6;
    const aeroPower = 0.5 * 1.225 * 0.28 * 2.3 * Math.pow(speedMs, 3) / 1000;
    const rollingPower = 1800 * 9.81 * 0.01 * speedMs / 1000;
    const accessoryPower = 0.8; // HVAC, electronics
    const drivePower = (aeroPower + rollingPower + accessoryPower) / motorEff;
    const regenPower = this.sim.phase === 'regen_braking' ? drivePower * 0.6 * motorEff : 0;
    const netPower = drivePower - regenPower;

    // SOC drain
    const energyDelta = (netPower * dt) / 60; // kWh in 100 ms
    this.sim.soc -= (energyDelta / this.brand.capacity) * 100;
    this.sim.soc = Math.max(0, Math.min(100, this.sim.soc));

    // Trip tracking
    this.sim.tripDistance += speedMs * dt;
    this.sim.tripEnergy += Math.max(0, drivePower * dt * 1000 / 3600); // Wh
    this.sim.tripRegen += regenPower * dt * 1000 / 3600; // Wh
    this.sim.tripMaxSpeed = Math.max(this.sim.tripMaxSpeed, this.sim.speed);
    this.sim.tripDuration += 100;
    this.sim.odometer += (speedMs * dt) / 1000;
  }

  // ── Charging Simulation ─────────────────────────────────────────────────────

  private tickCharging(): void {
    const dt = 0.1; // seconds

    // Determine max power based on type
    let maxPower: number;
    switch (this.sim.chargeType) {
      case 'dc_fast':  maxPower = this.brand.dcChargeMax; break;
      case 'ac_l2':    maxPower = Math.min(this.brand.acChargeMax, 11); break;
      case 'ac_l1':    maxPower = 2.3; break;
    }

    // DC fast charging tapers above ~50-80% SOC depending on chemistry
    let taperFactor = 1.0;
    if (this.sim.chargeType === 'dc_fast') {
      const taperStart = this.brand.chemistry === 'LFP' ? 80 : 50;
      if (this.sim.soc > taperStart) {
        taperFactor = Math.max(0.05, 1.0 - Math.pow((this.sim.soc - taperStart) / (100 - taperStart), 1.5));
      }
    }

    const power = maxPower * taperFactor * (0.95 + Math.random() * 0.1);
    const energyAdded = (power * dt) / 3600; // kWh
    this.sim.chargeEnergyAdded += energyAdded;
    this.sim.soc += (energyAdded / this.brand.capacity) * 100;
    this.sim.soc = Math.min(100, this.sim.soc);
    this.sim.acceleratorPedal = 0;
  }

  // ── Temperature Model ───────────────────────────────────────────────────────

  private tickTemperatures(): void {
    const dt = 0.1;
    const ambient = 28 + Math.sin(Date.now() / 60000) * 3; // slow drift

    // Battery temp: heats with power, cools via thermal management
    const powerDissipation = this.sim.isCharging
      ? this.getChargingPower() * this.brand.thermalCoeff
      : Math.abs(this.sim.speed) * 0.08 * this.brand.thermalCoeff;
    const cooling = (this.sim.batteryTemp - ambient) * 0.02; // passive + active
    this.sim.batteryTemp += (powerDissipation - cooling) * dt;
    this.sim.batteryTemp = Math.max(ambient - 2, Math.min(55, this.sim.batteryTemp));

    // Motor temp: proportional to speed and load
    const motorHeat = (this.sim.speed / 120) * 0.6 + (this.sim.acceleratorPedal / 100) * 0.3;
    const motorCool = (this.sim.motorTemp - ambient) * 0.03;
    this.sim.motorTemp += (motorHeat - motorCool) * dt;
    this.sim.motorTemp = Math.max(ambient - 1, Math.min(120, this.sim.motorTemp));

    // Inverter temp: tracks motor but with lower thermal mass
    this.sim.inverterTemp += ((this.sim.motorTemp * 0.95) - this.sim.inverterTemp) * 0.05;
    this.sim.inverterTemp = Math.max(ambient - 1, Math.min(95, this.sim.inverterTemp));

    // Coolant
    this.sim.coolantInlet = this.sim.batteryTemp - 2 + Math.random() * 0.5;
    this.sim.coolantOutlet = this.sim.batteryTemp + 2 + Math.random() * 0.5;
  }

  // ── Eco Score ───────────────────────────────────────────────────────────────

  private tickEcoScore(): void {
    this.sim.ecoSamples++;

    // Acceleration score: gentle = good
    const accelPenalty = this.sim.phase === 'accelerating'
      ? Math.min(1, this.sim.acceleratorPedal / 80)
      : 0;
    this.sim.ecoAccelScore += ((1 - accelPenalty) * 100 - this.sim.ecoAccelScore) * 0.01;

    // Braking score: regen = good, hard = bad
    const brakeScore = this.sim.phase === 'regen_braking' ? 90
      : this.sim.phase === 'decelerating' ? 70 : 85;
    this.sim.ecoBrakeScore += (brakeScore - this.sim.ecoBrakeScore) * 0.01;

    // Speed score: optimal around 60-90 km/h
    const speedOpt = 1 - Math.abs(this.sim.speed - 75) / 120;
    this.sim.ecoSpeedScore += (Math.max(0, speedOpt) * 100 - this.sim.ecoSpeedScore) * 0.01;

    // Efficiency score: lower consumption = better
    const consumption = this.sim.speed > 5
      ? (this.getInstantPower() / this.sim.speed) * 100
      : 0;
    const effScore = Math.max(0, 100 - consumption * 20);
    this.sim.ecoEffScore += (effScore - this.sim.ecoEffScore) * 0.01;
  }

  // ── Phase Transitions ───────────────────────────────────────────────────────

  private transitionPhase(): void {
    const phases: DrivingPhase[] = [
      'stationary', 'accelerating', 'cruising', 'decelerating',
      'regen_braking', 'city_driving',
    ];
    const weights: Record<DrivingPhase, { next: DrivingPhase; chance: number }[]> = {
      stationary:     [{ next: 'accelerating', chance: 0.6 }, { next: 'city_driving', chance: 0.4 }],
      accelerating:   [{ next: 'cruising', chance: 0.55 }, { next: 'city_driving', chance: 0.35 }, { next: 'decelerating', chance: 0.1 }],
      cruising:       [{ next: 'decelerating', chance: 0.35 }, { next: 'regen_braking', chance: 0.3 }, { next: 'accelerating', chance: 0.2 }, { next: 'stationary', chance: 0.15 }],
      decelerating:   [{ next: 'stationary', chance: 0.4 }, { next: 'accelerating', chance: 0.3 }, { next: 'city_driving', chance: 0.3 }],
      regen_braking:  [{ next: 'stationary', chance: 0.35 }, { next: 'accelerating', chance: 0.35 }, { next: 'city_driving', chance: 0.3 }],
      city_driving:   [{ next: 'stationary', chance: 0.2 }, { next: 'accelerating', chance: 0.25 }, { next: 'regen_braking', chance: 0.25 }, { next: 'cruising', chance: 0.15 }, { next: 'decelerating', chance: 0.15 }],
    };

    const transitions = weights[this.sim.phase];
    let r = Math.random();
    let chosen: DrivingPhase = 'stationary';
    for (const t of transitions) {
      r -= t.chance;
      if (r <= 0) { chosen = t.next; break; }
    }

    this.sim.phase = chosen;
    this.assignPhaseTarget(chosen);
  }

  private assignPhaseTarget(phase: DrivingPhase): void {
    const duration = (): number => {
      switch (phase) {
        case 'stationary':    return 3000 + Math.random() * 8000;
        case 'accelerating':  return 4000 + Math.random() * 6000;
        case 'cruising':      return 8000 + Math.random() * 20000;
        case 'decelerating':  return 3000 + Math.random() * 5000;
        case 'regen_braking': return 2000 + Math.random() * 4000;
        case 'city_driving':  return 10000 + Math.random() * 20000;
      }
    };
    this.sim.phaseTimer = duration();

    switch (phase) {
      case 'accelerating':
        this.sim.targetSpeed = 60 + Math.random() * 100; break;
      case 'cruising':
        this.sim.targetSpeed = 70 + Math.random() * 70; break;
      case 'city_driving':
        this.sim.targetSpeed = 20 + Math.random() * 40; break;
      case 'decelerating':
        this.sim.targetSpeed = Math.random() * 30; break;
      case 'regen_braking':
        this.sim.targetSpeed = 0; break;
      case 'stationary':
        this.sim.targetSpeed = 0; break;
    }
  }

  // ── Push to Store (500 ms) ──────────────────────────────────────────────────

  private pushToStore(): void {
    const s = this.sim;
    const b = this.brand;
    const store = useAppStore.getState();
    const now = Date.now();

    // Voltage model: chemistry-dependent
    const voltage = this.computeVoltage(s.soc);
    const current = this.getInstantPower() / (voltage || 1) * 1000; // mA approx
    const power = this.getInstantPower();

    // Cell voltages: simulate 96 cells with chemistry-appropriate spread
    const cellDeltaBase = b.typicalCellDelta;
    const socEffect = Math.sin(s.soc / 100 * Math.PI) * 0.6 + 0.4; // tighter at extremes
    const cellDelta = cellDeltaBase * socEffect;
    const cellMaxV = this.computeCellVoltage(s.soc);
    const cellMinV = cellMaxV - cellDelta;

    // Range from SOC
    const range = (s.soc / 100) * b.wltpRange;

    // Torque model
    const torqueDemand = (s.acceleratorPedal / 100) * 350 * (b.maxMotorPower / 150);
    const torqueActual = s.phase === 'regen_braking' ? -80 - Math.random() * 40 : torqueDemand * (0.9 + Math.random() * 0.1);
    const regenTorque = s.phase === 'regen_braking' ? -torqueActual : 0;

    // RPM: approximate from speed (gear ratio ~9:1 for EV)
    const rpm = (s.speed / 3.6) * 9 * 60 / (2 * Math.PI * 0.32);

    // Update vehicle data
    store.updateVehicleData({
      speed: Math.round(s.speed * 10) / 10,
      rpm: Math.round(rpm),
      soc: Math.round(s.soc * 10) / 10,
      soh: 96 + Math.random() * 4,
      voltage: Math.round(voltage * 10) / 10,
      current: Math.round(current) / 10,
      power: Math.round(power * 10) / 10,
      motorTemp: Math.round(s.motorTemp * 10) / 10,
      batteryTemp: Math.round(s.batteryTemp * 10) / 10,
      inverterTemp: Math.round(s.inverterTemp * 10) / 10,
      range: Math.round(range),
      odometer: Math.round(s.odometer * 10) / 10,
      mode: s.acceleratorPedal > 70 ? 'sport' : s.acceleratorPedal < 20 && s.speed < 50 ? 'eco' : 'normal',
      auxBatteryV: 12.2 + Math.random() * 0.4,
      insulationResistance: 800 + Math.random() * 400,
      cellMaxV: Math.round(cellMaxV),
      cellMinV: Math.round(cellMinV),
      cellDeltaV: Math.round(cellMaxV - cellMinV),
      acceleratorPedal: Math.round(s.acceleratorPedal * 10) / 10,
      torqueDemand: Math.round(torqueDemand),
      torqueActual: Math.round(torqueActual),
      regenTorque: Math.round(regenTorque),
      dcdcStatus: s.speed > 2 || s.isCharging,
      chargingStatus: s.isCharging,
      bmsStatus: s.isCharging ? 'charging' : s.speed > 2 ? 'discharging' : 'idle',
      coolantInletTemp: Math.round(s.coolantInlet * 10) / 10,
      coolantOutletTemp: Math.round(s.coolantOutlet * 10) / 10,
      ambientTemp: 28 + Math.sin(Date.now() / 60000) * 3,
    });

    // Update charging data if charging
    if (s.isCharging) {
      const chargePower = this.getChargingPower();
      const chargeVoltage = s.chargeType === 'dc_fast' ? voltage * 1.05 : 400;
      const chargeCurrent = chargePower * 1000 / (chargeVoltage || 1);
      const targetSoc = 80;
      const socRemaining = targetSoc - s.soc;
      const timeRemaining = socRemaining > 0
        ? (socRemaining / 100 * b.capacity) / chargePower * 60
        : 0;

      store.updateChargingData({
        isCharging: true,
        chargeType: s.chargeType,
        power: Math.round(chargePower * 10) / 10,
        voltage: Math.round(chargeVoltage * 10) / 10,
        current: Math.round(chargeCurrent * 10) / 10,
        energyAdded: Math.round(s.chargeEnergyAdded * 100) / 100,
        startSoc: s.chargeStartSoc,
        targetSoc,
        timeRemaining: Math.round(timeRemaining),
        efficiency: 88 + Math.random() * 6,
        costOmr: Math.round(s.chargeEnergyAdded * store.settings.electricityCostPerKwh * 1000) / 1000,
        costUsd: Math.round(s.chargeEnergyAdded * 0.12 * 100) / 100,
        cellVoltages: Array.from({ length: 24 }, (_, i) =>
          Math.round(cellMinV + (cellDelta * i / 24) + Math.random() * 3)
        ),
      });
    } else {
      store.updateChargingData({
        isCharging: false,
        power: 0,
        voltage: 0,
        current: 0,
      });
    }

    // History points
    store.addBatteryHistory({ value: s.soc, timestamp: now });
    store.addPowerHistory({ value: power, timestamp: now });
    if (this.tickCount % 2 === 0) {
      store.addTemperatureHistory({
        value: s.batteryTemp,
        timestamp: now,
      });
    }

    // Trip data
    const tripHours = s.tripDuration / 3600000;
    const tripKm = s.tripDistance / 1000;
    store.updateTripData({
      distance: Math.round(tripKm * 10) / 10,
      avgSpeed: tripHours > 0 ? Math.round(tripKm / tripHours * 10) / 10 : 0,
      maxSpeed: Math.round(s.tripMaxSpeed * 10) / 10,
      energyConsumed: Math.round(s.tripEnergy / 1000 * 100) / 100,
      energyRegen: Math.round(s.tripRegen / 1000 * 100) / 100,
      duration: Math.round(s.tripDuration / 1000),
      endSoc: Math.round(s.soc * 10) / 10,
    });

    // Eco score
    const overall = Math.round(
      (s.ecoAccelScore * 0.25 + s.ecoBrakeScore * 0.25 +
       s.ecoSpeedScore * 0.25 + s.ecoEffScore * 0.25)
    );
    store.updateEcoScore({
      overall,
      acceleration: Math.round(s.ecoAccelScore),
      braking: Math.round(s.ecoBrakeScore),
      speed: Math.round(s.ecoSpeedScore),
      efficiency: Math.round(s.ecoEffScore),
    });

    // Device info
    store.updateDeviceInfo({
      name: 'EVDx Simulator',
      type: 'OBD-II Emulator',
      firmware: '2.4.1',
      protocol: 'ISO 15765-4 (CAN)',
      voltage: 12.4 + Math.random() * 0.2,
      chipset: 'ELM327 (Sim)',
      bleVersion: '5.0',
      signalStrength: -40 - Math.random() * 20,
      responseTime: 15 + Math.random() * 30,
      adapterId: 'SIM-001',
      quality: 'excellent',
      isClone: false,
    });

    // Session logging (if enabled)
    if (store.isLogging) {
      store.addSessionLog({
        timestamp: now,
        level: 'info',
        message: `phase=${s.phase} speed=${s.speed.toFixed(1)} soc=${s.soc.toFixed(1)} power=${power.toFixed(1)}`,
      });
    }
  }

  // ── Voltage Models ──────────────────────────────────────────────────────────

  /**
   * Compute pack voltage from SOC using chemistry-specific discharge curves.
   *
   * LFP: very flat curve, ~3.2-3.3 V across 20-90% SOC
   * NCA: steeper taper, ~3.0-4.1 V
   * NMC/NCM: moderate, ~3.1-4.0 V
   */
  private computeVoltage(soc: number): number {
    const cellV = this.computeCellVoltage(soc);
    return (cellV / 1000) * this.brand.cellCount;
  }

  private computeCellVoltage(soc: number): number {
    const { cellMaxV, cellMinV, chemistry } = this.brand;
    const range = cellMaxV - cellMinV;
    const socNorm = Math.max(0, Math.min(1, soc / 100));

    switch (chemistry) {
      case 'LFP': {
        // LFP has a very flat mid-region; steep drop at top and bottom
        const mid = cellMinV + range * 0.78;
        if (socNorm > 0.9) return mid + (cellMaxV - mid) * Math.pow((socNorm - 0.9) / 0.1, 0.5);
        if (socNorm < 0.1) return cellMinV + (mid - cellMinV) * Math.pow(socNorm / 0.1, 1.5);
        return mid + (Math.random() - 0.5) * 5; // ±2.5 mV noise
      }
      case 'NCA': {
        // NCA has noticeable taper
        return cellMinV + range * (0.3 * socNorm + 0.7 * Math.pow(socNorm, 0.7));
      }
      case 'NMC':
      case 'NCM':
      default: {
        // Moderate curve
        return cellMinV + range * Math.pow(socNorm, 0.8);
      }
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private getInstantPower(): number {
    if (this.sim.isCharging) return -this.getChargingPower();
    if (this.sim.speed < 1) return 0.3; // accessory load
    const speedMs = this.sim.speed / 3.6;
    const aero = 0.5 * 1.225 * 0.28 * 2.3 * Math.pow(speedMs, 3) / 1000;
    const rolling = 1800 * 9.81 * 0.01 * speedMs / 1000;
    const accessory = 0.8;
    const drive = (aero + rolling + accessory) / 0.92;
    const regen = this.sim.phase === 'regen_braking' ? drive * 0.55 : 0;
    return drive - regen;
  }

  private getChargingPower(): number {
    if (!this.sim.isCharging) return 0;
    let maxPower: number;
    switch (this.sim.chargeType) {
      case 'dc_fast':  maxPower = this.brand.dcChargeMax; break;
      case 'ac_l2':    maxPower = Math.min(this.brand.acChargeMax, 11); break;
      case 'ac_l1':    maxPower = 2.3; break;
    }
    // Apply taper for DC fast
    if (this.sim.chargeType === 'dc_fast') {
      const taperStart = this.brand.chemistry === 'LFP' ? 80 : 50;
      if (this.sim.soc > taperStart) {
        maxPower *= Math.max(0.05, 1.0 - Math.pow((this.sim.soc - taperStart) / (100 - taperStart), 1.5));
      }
    }
    return maxPower * (0.95 + Math.random() * 0.1);
  }

  private resolveBrand(vehicle: VehicleProfile | null): BrandParams {
    if (!vehicle) return BRAND_PROFILES.generic;
    const brandId = vehicle.brand.toLowerCase().replace(/\s+/g, '-');
    return BRAND_PROFILES[brandId] ?? BRAND_PROFILES.generic;
  }

  private createDefaultSimState(): SimState {
    return {
      speed: 0,
      targetSpeed: 0,
      phase: 'stationary',
      phaseTimer: 3000,
      soc: 75,
      batteryTemp: 28,
      motorTemp: 30,
      inverterTemp: 29,
      coolantInlet: 26,
      coolantOutlet: 28,
      tripDistance: 0,
      tripEnergy: 0,
      tripRegen: 0,
      tripMaxSpeed: 0,
      tripDuration: 0,
      odometer: 45000,
      acceleratorPedal: 0,
      isCharging: false,
      chargeType: 'dc_fast',
      chargeEnergyAdded: 0,
      chargeStartSoc: 0,
      ecoAccelScore: 70,
      ecoBrakeScore: 75,
      ecoSpeedScore: 65,
      ecoEffScore: 70,
      ecoSamples: 0,
    };
  }

  /** Basic DTC description lookup for common EV codes */
  private describeDTC(code: string): string {
    const descriptions: Record<string, string> = {
      'P0A80': 'Hybrid Battery Pack Deterioration',
      'P0A81': 'Hybrid Battery Pack Cooling Fan 1',
      'P0A82': 'Hybrid Battery Pack Cooling Fan 2',
      'P0AFA': 'Hybrid Battery Voltage Out Of Range',
      'P0B94': 'Drive Motor Inverter Over Temperature',
      'P0BE1': 'Drive Motor Phase U Current',
      'P0BE2': 'Drive Motor Phase V Current',
      'P0BE3': 'Drive Motor Phase W Current',
      'P0C34': 'Hybrid Battery Precharge Time Too Long',
      'P0C79': 'Drive Motor Inverter Performance',
      'P1100': 'BMS Communication Error',
      'P1200': 'MCU Over Temperature Protection',
      'U0100': 'Lost Communication With ECM/PCM',
      'U0111': 'Lost Communication With Battery Energy Control Module',
      'U0140': 'Lost Communication With Body Control Module',
      'B1200': 'Climate Control Module Fault',
      'B1234': 'Battery Pack Insulation Failure',
    };
    return descriptions[code] ?? `Unknown Fault - ${code}`;
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

/** Global simulator instance – safe to import anywhere in the app */
export const simulator = new SimulatorEngine();
