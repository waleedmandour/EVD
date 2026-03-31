import { useAppStore } from './store';
import type { BatteryHistoryEntry, DiagnosticTroubleCode, ChargingType } from './types';

// ─── Driving Scenario Generator ────────────────────────────────────
// Simulates a realistic BYD Yuan Plus (Atto 3) driving cycle
// Battery: 60.48 kWh Blade Battery, ~420 km WLTP range

type DrivingPhase = 'stationary' | 'accelerating' | 'cruising' | 'decelerating' | 'regen_braking' | 'city_driving';

interface SimState {
  tick: number;
  phase: DrivingPhase;
  phaseTicks: number;
  targetSpeed: number;
  baseSOC: number;
  baseVoltage: number;
  baseMotorTemp: number;
  baseBatteryTemp: number;
  tripDistance: number;
  tripMaxSpeed: number;
  tripSpeedSum: number;
  tripSpeedCount: number;
  tripConsumption: number;
  tripRegenEnergy: number;
}

let simState: SimState | null = null;
let simInterval: ReturnType<typeof setInterval> | null = null;

function createInitialState(): SimState {
  return {
    tick: 0, phase: 'stationary', phaseTicks: 0, targetSpeed: 0,
    baseSOC: 78, baseVoltage: 395.2, baseMotorTemp: 38, baseBatteryTemp: 32,
    tripDistance: 0, tripMaxSpeed: 0, tripSpeedSum: 0, tripSpeedCount: 0,
    tripConsumption: 0, tripRegenEnergy: 0,
  };
}

function getNextPhase(current: DrivingPhase): DrivingPhase {
  const transitions: Record<DrivingPhase, DrivingPhase[]> = {
    stationary: ['accelerating', 'city_driving'],
    accelerating: ['cruising', 'city_driving', 'decelerating'],
    cruising: ['accelerating', 'decelerating', 'regen_braking', 'stationary'],
    decelerating: ['stationary', 'accelerating', 'regen_braking', 'city_driving'],
    regen_braking: ['stationary', 'accelerating', 'city_driving'],
    city_driving: ['accelerating', 'cruising', 'decelerating', 'stationary'],
  };
  const options = transitions[current];
  return options[Math.floor(Math.random() * options.length)];
}

function getTargetForPhase(phase: DrivingPhase): number {
  switch (phase) {
    case 'stationary': return 0;
    case 'city_driving': return 15 + Math.random() * 45;
    case 'cruising': return 70 + Math.random() * 50;
    case 'accelerating': return 20 + Math.random() * 80;
    case 'decelerating': return 5 + Math.random() * 30;
    case 'regen_braking': return 0;
    default: return 0;
  }
}

function lerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function calculatePower(speed: number, phase: DrivingPhase): number {
  if (phase === 'stationary') return 0.3 + Math.random() * 0.2;
  const baseLoad = 0.5;
  const dragCoeff = 0.00012;
  const speedFactor = speed * speed * dragCoeff;
  const linearFactor = speed * 0.025;
  if (phase === 'regen_braking' || phase === 'decelerating') {
    return -(5 + speed * 0.3 + Math.random() * 5);
  }
  return baseLoad + linearFactor + speedFactor + (Math.random() - 0.5) * 2;
}

function tickSimulation() {
  const state = simState;
  if (!state) return;

  const store = useAppStore.getState();
  state.tick++;
  state.phaseTicks++;

  const phaseDuration = state.phase === 'stationary'
    ? 30 + Math.random() * 50
    : 60 + Math.random() * 140;

  if (state.phaseTicks >= phaseDuration) {
    state.phase = getNextPhase(state.phase);
    state.targetSpeed = getTargetForPhase(state.phase);
    state.phaseTicks = 0;
  }

  let newSpeed: number;
  if (state.phase === 'stationary') {
    newSpeed = lerp(store.vehicleData.speed, 0, 0.15);
    if (newSpeed < 0.5) newSpeed = 0;
  } else if (state.phase === 'regen_braking') {
    newSpeed = lerp(store.vehicleData.speed, 0, 0.08);
    if (newSpeed < 0.5) newSpeed = 0;
  } else {
    if (Math.random() < 0.02) state.targetSpeed = getTargetForPhase(state.phase);
    newSpeed = lerp(store.vehicleData.speed, state.targetSpeed, 0.03 + Math.random() * 0.02);
  }

  newSpeed = clamp(Math.round(newSpeed * 10) / 10, 0, 180);

  const power = calculatePower(newSpeed, state.phase);
  const motorRPM = newSpeed > 0 ? newSpeed * 45 + Math.random() * 50 : 0;
  const regen = power < 0;

  const powerKW = Math.abs(power);
  const tickHours = 0.1 / 3600;
  const energyUsed = powerKW * tickHours;
  const capacity = 60.48;

  let socDelta = 0;
  if (power > 0) {
    socDelta = -(energyUsed / capacity) * 100;
  } else if (power < 0) {
    socDelta = (energyUsed * 0.9 / capacity) * 100;
    state.tripRegenEnergy += energyUsed * 0.9;
  }
  state.baseSOC = clamp(state.baseSOC + socDelta, 5, 100);
  state.tripConsumption += Math.max(0, energyUsed);

  const socFactor = state.baseSOC / 100;
  const loadDrop = newSpeed > 0 ? (powerKW / 100) * 5 : 0;
  const voltage = clamp(340 + (socFactor * 65) - loadDrop + (Math.random() - 0.5) * 2, 300, 420);
  const current = voltage > 0 ? (power * 1000) / voltage : 0;

  const tempChange = newSpeed > 20 ? 0.008 : newSpeed > 0 ? 0.003 : -0.005;
  state.baseMotorTemp = clamp(state.baseMotorTemp + tempChange + (Math.random() - 0.5) * 0.01, 25, 95);
  state.baseBatteryTemp = clamp(state.baseBatteryTemp + tempChange * 0.6 + (Math.random() - 0.5) * 0.005, 22, 50);

  const range = (state.baseSOC / 100 * capacity * 1000) / 16;

  const distDelta = newSpeed * (0.1 / 3600);
  state.tripDistance += distDelta;
  state.tripMaxSpeed = Math.max(state.tripMaxSpeed, newSpeed);
  if (newSpeed > 2) { state.tripSpeedSum += newSpeed; state.tripSpeedCount++; }

  let driveMode = store.vehicleData.driveMode;
  if (Math.random() < 0.003) {
    const modes = ['ECO', 'NORMAL', 'SPORT'];
    driveMode = modes[Math.floor(Math.random() * modes.length)];
  }

  const now = Date.now();
  store.updateVehicleData({
    speed: newSpeed, rpm: Math.round(motorRPM),
    batterySOC: Math.round(state.baseSOC * 10) / 10,
    batteryVoltage: Math.round(voltage * 10) / 10,
    batteryCurrent: Math.round(current * 10) / 10,
    batteryPower: Math.round(power * 10) / 10,
    batteryTemp: Math.round(state.baseBatteryTemp * 10) / 10,
    motorTemp: Math.round(state.baseMotorTemp * 10) / 10,
    cabinTemp: 26 + Math.sin(state.tick * 0.01) * 1.5,
    ambientTemp: 35 + Math.sin(state.tick * 0.005) * 2,
    estimatedRange: Math.round(range),
    isCharging: false, chargingPower: 0, hvacActive: true,
    regenBraking: regen, driveMode,
  });

  if (state.tick % 5 === 0) {
    store.addSpeedHistory(newSpeed);
    store.addPowerHistory(power);
    store.addBatteryHistory({
      time: now, soc: Math.round(state.baseSOC * 10) / 10,
      voltage: Math.round(voltage * 10) / 10,
      temp: Math.round(state.baseBatteryTemp * 10) / 10,
    });

    if (store.isLogging) {
      store.addSessionLog({
        time: now, speed: newSpeed, rpm: Math.round(motorRPM),
        soc: Math.round(state.baseSOC * 10) / 10, voltage: Math.round(voltage * 10) / 10,
        current: Math.round(current * 10) / 10, power: Math.round(power * 10) / 10,
        batteryTemp: Math.round(state.baseBatteryTemp * 10) / 10,
        motorTemp: Math.round(state.baseMotorTemp * 10) / 10,
        ambientTemp: Math.round(store.vehicleData.ambientTemp * 10) / 10, regenBraking: regen,
      });
    }

    const ecoAccel = newSpeed > 0 ? Math.max(0, 100 - Math.abs(store.vehicleData.speed - newSpeed) * 5) : 100;
    const ecoBrake = regen ? 95 : (state.phase === 'decelerating' ? 60 : 80);
    const ecoSpd = newSpeed > 0 && newSpeed < 100 ? 90 : newSpeed >= 100 ? 50 : 100;
    const ecoEff = state.baseSOC > 20 ? 85 : 30;
    const ecoOverall = Math.round(ecoAccel * 0.3 + ecoBrake * 0.25 + ecoSpd * 0.25 + ecoEff * 0.2);
    store.updateEcoScore({
      acceleration: Math.round(ecoAccel), braking: Math.round(ecoBrake),
      speed: Math.round(ecoSpd), efficiency: Math.round(ecoEff),
      overall: ecoOverall, history: [ecoOverall],
    });

    store.setTripData({
      distance: Math.round(state.tripDistance * 100) / 100,
      maxSpeed: Math.round(state.tripMaxSpeed),
      avgSpeed: state.tripSpeedCount > 0 ? Math.round(state.tripSpeedSum / state.tripSpeedCount) : 0,
      avgConsumption: state.tripDistance > 0.01 ? Math.round((state.tripConsumption / state.tripDistance) * 100) / 100 : 0,
      totalConsumption: Math.round(state.tripConsumption * 1000) / 1000,
      regenEnergy: Math.round(state.tripRegenEnergy * 1000) / 1000,
      duration: state.tick / 10,
    });

    store.setDeviceInfo({
      lastPing: now,
      responseTime: Math.round(Math.random() * 10 + 8),
      signalStrength: clamp(store.deviceInfo.signalStrength + (Math.random() - 0.5) * 2, 70, 100),
    });
  }
}

// ─── Charging Simulator ────────────────────────────────────────────
// Simulates BYD Yuan Plus charging sessions

interface ChargeSimState {
  tick: number;
  currentSOC: number;
  startedSOC: number;
  totalEnergyAdded: number;
  baseBatteryTemp: number;
}

let chargeSimState: ChargeSimState | null = null;
let chargeSimInterval: ReturnType<typeof setInterval> | null = null;

function getChargeConfig(type: ChargingType) {
  switch (type) {
    case 'dc_fast':
      return { maxPower: 60, maxCurrent: 150, maxVoltage: 403, efficiency: 0.95, name: 'DC Fast Charger', connector: 'CCS2', taperSOC: 78 };
    case 'ac_l2':
      return { maxPower: 7.2, maxCurrent: 32, maxVoltage: 400, efficiency: 0.92, name: 'AC Level 2 (7.2 kW)', connector: 'Type 2', taperSOC: 92 };
    case 'ac_l1':
      return { maxPower: 1.8, maxCurrent: 10, maxVoltage: 240, efficiency: 0.90, name: 'AC Level 1 (1.8 kW)', connector: 'Type 2', taperSOC: 95 };
    default:
      return { maxPower: 0, maxCurrent: 0, maxVoltage: 0, efficiency: 0, name: '', connector: '', taperSOC: 100 };
  }
}

function tickChargingSimulation() {
  const state = chargeSimState;
  if (!state) return;

  const store = useAppStore.getState();
  const config = getChargeConfig(store.chargingData.type);
  state.tick++;

  if (state.currentSOC >= 100) {
    // Charging complete
    store.updateChargingData({
      isActive: false, power: 0, current: 0,
      estimatedMinutesLeft: 0, type: 'off',
    });
    store.updateVehicleData({ isCharging: false, chargingPower: 0 });
    store.setIsChargingSim(false);
    stopChargingSimulator();
    return;
  }

  // BYD Blade Battery charging curve (LFP):
  // - CC phase: constant power up to taperSOC
  // - CV phase: power tapers down as cells approach 3.65V max
  const taperSOC = config.taperSOC;
  let powerFactor = 1.0;
  if (state.currentSOC > taperSOC) {
    // Taper phase — exponential decay
    const overTaper = (state.currentSOC - taperSOC) / (100 - taperSOC);
    powerFactor = Math.exp(-overTaper * 3.5); // smooth exponential taper
  }

  // Add realistic fluctuation
  const fluctuation = 0.97 + Math.random() * 0.06;

  const chargePower = config.maxPower * powerFactor * fluctuation;
  const chargeVoltage = 340 + (state.currentSOC / 100) * 60 * (0.8 + powerFactor * 0.2);
  const chargeCurrent = chargeVoltage > 0 ? (chargePower * 1000) / chargeVoltage : 0;

  const tickHours = 0.1 / 3600;
  const energyThisTick = chargePower * tickHours * config.efficiency;
  const capacity = 60.48;
  const socDelta = (energyThisTick / capacity) * 100;

  state.currentSOC = clamp(state.currentSOC + socDelta, 0, 100);
  state.totalEnergyAdded += energyThisTick;

  // Battery temp: slowly rises during charge, thermal management kicks in above 38°C
  const tempTarget = chargePower > 20 ? 38 : chargePower > 5 ? 34 : 30;
  const tempRate = 0.002;
  state.baseBatteryTemp = clamp(
    state.baseBatteryTemp + (tempTarget - state.baseBatteryTemp) * tempRate * 10 + (Math.random() - 0.5) * 0.01,
    22, 45
  );

  // Cell voltages
  const baseCellVoltage = 3.2 + (state.currentSOC / 100) * 0.45;
  const cellMax = baseCellVoltage + 0.005 + Math.random() * 0.008;
  const cellMin = baseCellVoltage - 0.005 - Math.random() * 0.008;
  const cellDelta = (cellMax - cellMin) * 1000;

  // Estimated time remaining
  const remainingEnergy = ((100 - state.currentSOC) / 100) * capacity;
  const avgPower = chargePower * config.efficiency * 0.85; // account for taper
  const minutesLeft = avgPower > 0 ? Math.round((remainingEnergy / avgPower) * 60) : 0;

  // Range estimation
  const range = (state.currentSOC / 100 * capacity * 1000) / 16;

  const now = Date.now();
  const packVoltage = Math.round(chargeVoltage * 10) / 10;

  store.updateVehicleData({
    speed: 0, rpm: 0,
    batterySOC: Math.round(state.currentSOC * 10) / 10,
    batteryVoltage: packVoltage,
    batteryCurrent: Math.round(chargeCurrent * 10) / 10,
    batteryPower: Math.round(chargePower * 10) / 10,
    batteryTemp: Math.round(state.baseBatteryTemp * 10) / 10,
    motorTemp: Math.round(state.baseBatteryTemp * 0.9 * 10) / 10,
    cabinTemp: 28 + Math.sin(state.tick * 0.008) * 0.5,
    ambientTemp: 35 + Math.sin(state.tick * 0.004) * 1.5,
    estimatedRange: Math.round(range),
    isCharging: true,
    chargingPower: Math.round(chargePower * 10) / 10,
    hvacActive: false,
    regenBraking: false,
    driveMode: 'PARK',
  });

  // Update charging history every 10 ticks (1 second)
  if (state.tick % 10 === 0) {
    store.addBatteryHistory({
      time: now, soc: Math.round(state.currentSOC * 10) / 10,
      voltage: packVoltage, temp: Math.round(state.baseBatteryTemp * 10) / 10,
    });

    store.updateChargingData({
      power: Math.round(chargePower * 10) / 10,
      voltage: Math.round(chargeVoltage * 10) / 10,
      current: Math.round(chargeCurrent * 10) / 10,
      energyAdded: Math.round(state.totalEnergyAdded * 1000) / 1000,
      elapsedSeconds: Math.round(state.tick / 10),
      estimatedMinutesLeft: minutesLeft,
      chargeEfficiency: Math.round(config.efficiency * 100),
      batteryTemp: Math.round(state.baseBatteryTemp * 10) / 10,
      cabinPreconditioning: state.currentSOC < 50 && state.baseBatteryTemp > 25,
      cellMaxVoltage: Math.round(cellMax * 1000) / 1000,
      cellMinVoltage: Math.round(cellMin * 1000) / 1000,
      cellDelta: Math.round(cellDelta),
      history: [...store.chargingData.history.slice(-59), {
        time: now, soc: Math.round(state.currentSOC * 10) / 10,
        power: Math.round(chargePower * 10) / 10,
        voltage: Math.round(chargeVoltage * 10) / 10,
        current: Math.round(chargeCurrent * 10) / 10,
        temp: Math.round(state.baseBatteryTemp * 10) / 10,
      }],
    });

    store.setDeviceInfo({
      lastPing: now,
      responseTime: Math.round(Math.random() * 8 + 6),
      signalStrength: clamp(store.deviceInfo.signalStrength + (Math.random() - 0.5) * 1.5, 80, 100),
    });
  }
}

export function startSimulator() {
  if (simInterval) return;
  simState = createInitialState();
  simInterval = setInterval(tickSimulation, 100);
}

export function stopSimulator() {
  if (simInterval) { clearInterval(simInterval); simInterval = null; }
  simState = null;
}

export function startChargingSimulator(type: ChargingType, currentSOC: number) {
  stopSimulator();
  stopChargingSimulator();

  chargeSimState = {
    tick: 0,
    currentSOC,
    startedSOC: currentSOC,
    totalEnergyAdded: 0,
    baseBatteryTemp: 30 + Math.random() * 3,
  };

  const config = getChargeConfig(type);

  useAppStore.getState().updateChargingData({
    isActive: true,
    type,
    startedSOC: currentSOC,
    energyAdded: 0,
    elapsedSeconds: 0,
    estimatedMinutesLeft: 0,
    chargeEfficiency: Math.round(config.efficiency * 100),
    chargerName: config.name,
    connectorType: config.connector,
    history: [],
    power: 0, voltage: 0, current: 0, batteryTemp: chargeSimState.baseBatteryTemp,
    cabinPreconditioning: false, cellMaxVoltage: 0, cellMinVoltage: 0, cellDelta: 0,
  });

  useAppStore.getState().setIsChargingSim(true);
  chargeSimInterval = setInterval(tickChargingSimulation, 100);
}

export function stopChargingSimulator() {
  if (chargeSimInterval) { clearInterval(chargeSimInterval); chargeSimInterval = null; }
  chargeSimState = null;
  useAppStore.getState().setIsChargingSim(false);
  useAppStore.getState().updateChargingData({ isActive: false, type: 'off' });
  useAppStore.getState().updateVehicleData({ isCharging: false, chargingPower: 0 });
}

export function isSimulatorRunning(): boolean {
  return simInterval !== null;
}

export function isChargingSimRunning(): boolean {
  return chargeSimInterval !== null;
}

// Demo DTC data
export function getDemoDTCs(): DiagnosticTroubleCode[] {
  return [
    { code: 'P0A80', description: 'Drive Motor Inverter Performance', status: 'confirmed', milOn: false },
    { code: 'P0C00', description: 'Drive Motor Phase U Current Circuit/Open', status: 'pending', milOn: false },
  ];
}

export function getDemoMonitorStatus(): Record<string, boolean> {
  return {
    'Catalyst Monitor': true, 'EV System': true, 'O2 Sensor': true,
    'Fuel System': true, 'Misfire': false, 'EGR System': false,
  };
}
