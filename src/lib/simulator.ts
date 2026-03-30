import { useAppStore } from './store';
import type { BatteryHistoryEntry, DiagnosticTroubleCode } from './types';

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
    tick: 0,
    phase: 'stationary',
    phaseTicks: 0,
    targetSpeed: 0,
    baseSOC: 78,
    baseVoltage: 395.2,
    baseMotorTemp: 38,
    baseBatteryTemp: 32,
    tripDistance: 0,
    tripMaxSpeed: 0,
    tripSpeedSum: 0,
    tripSpeedCount: 0,
    tripConsumption: 0,
    tripRegenEnergy: 0,
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
    case 'city_driving': return 15 + Math.random() * 45; // 15-60 km/h
    case 'cruising': return 70 + Math.random() * 50;     // 70-120 km/h
    case 'accelerating': return 20 + Math.random() * 80;  // 20-100 km/h
    case 'decelerating': return 5 + Math.random() * 30;   // 5-35 km/h
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
  // BYD Yuan Plus: ~12-16 Wh/km at city speeds, ~17-22 Wh/km at highway
  // Power = speed * consumption_rate + base_load
  if (phase === 'stationary') return 0.3 + Math.random() * 0.2; // HVAC standby

  const baseLoad = 0.5; // electronics, HVAC
  const dragCoeff = 0.00012; // aerodynamic + rolling resistance factor
  const speedFactor = speed * speed * dragCoeff; // quadratic drag
  const linearFactor = speed * 0.025; // rolling resistance

  if (phase === 'regen_braking' || phase === 'decelerating') {
    return -(5 + speed * 0.3 + Math.random() * 5); // regen power (negative)
  }

  return baseLoad + linearFactor + speedFactor + (Math.random() - 0.5) * 2;
}

function tickSimulation() {
  const state = simState;
  if (!state) return;

  const store = useAppStore.getState();
  state.tick++;
  state.phaseTicks++;

  // Phase transitions every 5-20 seconds (50-200 ticks at 100ms intervals)
  const phaseDuration = state.phase === 'stationary'
    ? 30 + Math.random() * 50
    : 60 + Math.random() * 140;

  if (state.phaseTicks >= phaseDuration) {
    state.phase = getNextPhase(state.phase);
    state.targetSpeed = getTargetForPhase(state.phase);
    state.phaseTicks = 0;
  }

  // Smoothly approach target speed
  let newSpeed: number;
  if (state.phase === 'stationary') {
    newSpeed = lerp(store.vehicleData.speed, 0, 0.15);
    if (newSpeed < 0.5) newSpeed = 0;
  } else if (state.phase === 'regen_braking') {
    newSpeed = lerp(store.vehicleData.speed, 0, 0.08);
    if (newSpeed < 0.5) newSpeed = 0;
  } else {
    // Occasionally vary target within phase
    if (Math.random() < 0.02) {
      state.targetSpeed = getTargetForPhase(state.phase);
    }
    newSpeed = lerp(store.vehicleData.speed, state.targetSpeed, 0.03 + Math.random() * 0.02);
  }

  newSpeed = clamp(Math.round(newSpeed * 10) / 10, 0, 180);

  // Calculate derived values
  const power = calculatePower(newSpeed, state.phase);
  const motorRPM = newSpeed > 0 ? newSpeed * 45 + Math.random() * 50 : 0; // approx gearing
  const regen = power < 0;

  // Battery discharge model
  const powerKW = Math.abs(power);
  const tickHours = 0.1 / 3600; // 100ms in hours
  const energyUsed = powerKW * tickHours;
  const capacity = 60.48; // kWh

  let socDelta = 0;
  if (power > 0) {
    socDelta = -(energyUsed / capacity) * 100;
  } else if (power < 0) {
    socDelta = (energyUsed * 0.9 / capacity) * 100; // 90% regen efficiency
    state.tripRegenEnergy += energyUsed * 0.9;
  }
  state.baseSOC = clamp(state.baseSOC + socDelta, 5, 100);
  state.tripConsumption += Math.max(0, energyUsed);

  // Voltage model: decreases slightly with SOC
  const socFactor = state.baseSOC / 100;
  const loadDrop = newSpeed > 0 ? (powerKW / 100) * 5 : 0;
  const voltage = clamp(
    340 + (socFactor * 65) - loadDrop + (Math.random() - 0.5) * 2,
    300, 420
  );

  // Current
  const current = voltage > 0 ? (power * 1000) / voltage : 0;

  // Temperature model: slowly rises when driving, cools when stopped
  const tempChange = newSpeed > 20 ? 0.008 : newSpeed > 0 ? 0.003 : -0.005;
  state.baseMotorTemp = clamp(state.baseMotorTemp + tempChange + (Math.random() - 0.5) * 0.01, 25, 95);
  state.baseBatteryTemp = clamp(state.baseBatteryTemp + tempChange * 0.6 + (Math.random() - 0.5) * 0.005, 22, 50);

  // Range estimation: based on current SOC and efficiency
  const efficiency = newSpeed > 5 ? powerKW / (newSpeed * tickHours * 10000) * 1000 : 15; // Wh/km
  const range = (state.baseSOC / 100 * capacity * 1000) / 16; // simplified: using 16 Wh/km average

  // Trip tracking
  const distDelta = newSpeed * (0.1 / 3600); // km in this tick
  state.tripDistance += distDelta;
  state.tripMaxSpeed = Math.max(state.tripMaxSpeed, newSpeed);
  if (newSpeed > 2) {
    state.tripSpeedSum += newSpeed;
    state.tripSpeedCount++;
  }

  // Drive mode changes occasionally
  let driveMode = store.vehicleData.driveMode;
  if (Math.random() < 0.003) {
    const modes = ['ECO', 'NORMAL', 'SPORT'];
    driveMode = modes[Math.floor(Math.random() * modes.length)];
  }

  // Update store
  const now = Date.now();
  store.updateVehicleData({
    speed: newSpeed,
    rpm: Math.round(motorRPM),
    batterySOC: Math.round(state.baseSOC * 10) / 10,
    batteryVoltage: Math.round(voltage * 10) / 10,
    batteryCurrent: Math.round(current * 10) / 10,
    batteryPower: Math.round(power * 10) / 10,
    batteryTemp: Math.round(state.baseBatteryTemp * 10) / 10,
    motorTemp: Math.round(state.baseMotorTemp * 10) / 10,
    cabinTemp: 26 + Math.sin(state.tick * 0.01) * 1.5,
    ambientTemp: 35 + Math.sin(state.tick * 0.005) * 2,
    estimatedRange: Math.round(range),
    isCharging: false,
    chargingPower: 0,
    hvacActive: true,
    regenBraking: regen,
    driveMode,
  });

  // Update histories every 5 ticks (500ms)
  if (state.tick % 5 === 0) {
    store.addSpeedHistory(newSpeed);
    store.addPowerHistory(power);

    const historyEntry: BatteryHistoryEntry = {
      time: now,
      soc: Math.round(state.baseSOC * 10) / 10,
      voltage: Math.round(voltage * 10) / 10,
      temp: Math.round(state.baseBatteryTemp * 10) / 10,
    };
    store.addBatteryHistory(historyEntry);

    // Update trip data
    store.tripData = {
      ...store.tripData,
      distance: Math.round(state.tripDistance * 100) / 100,
      maxSpeed: Math.round(state.tripMaxSpeed),
      avgSpeed: state.tripSpeedCount > 0
        ? Math.round(state.tripSpeedSum / state.tripSpeedCount)
        : 0,
      avgConsumption: state.tripDistance > 0.01
        ? Math.round((state.tripConsumption / state.tripDistance) * 100) / 100
        : 0,
      totalConsumption: Math.round(state.tripConsumption * 1000) / 1000,
      regenEnergy: Math.round(state.tripRegenEnergy * 1000) / 1000,
      duration: state.tick / 10,
    };
  }
}

export function startSimulator() {
  if (simInterval) return;
  simState = createInitialState();
  simInterval = setInterval(tickSimulation, 100); // 10 Hz update rate
}

export function stopSimulator() {
  if (simInterval) {
    clearInterval(simInterval);
    simInterval = null;
  }
  simState = null;
}

export function isSimulatorRunning(): boolean {
  return simInterval !== null;
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
    'Catalyst Monitor': true,
    'EV System': true,
    'O2 Sensor': true,
    'Fuel System': true,
    'Misfire': false,
    'EGR System': false,
  };
}
