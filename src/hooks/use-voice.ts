'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

// ─── Page-specific voice narration scripts ────────────────────────────

const PAGE_SCRIPTS: Record<string, string> = {
  dashboard: `Welcome to the Dashboard. This is your main driving view. 
    The speed gauge shows your current vehicle speed in kilometers per hour, up to 180. 
    The Battery State of Charge gauge displays the current charge level with color indicators. Green means good, amber means moderate, and red means critically low. 
    The Motor Power gauge shows real-time power draw or regenerative energy recovery. 
    Below, you'll find estimated range, motor RPM, and battery voltage. 
    The Speed Profile chart tracks your recent driving speed, and the Power Flow chart distinguishes between energy draw and regenerative braking. 
    Temperature bars at the bottom monitor motor, battery pack, cabin, and ambient temperatures with warning thresholds.`,
  
  battery: `Battery Monitor. This page provides comprehensive information about your BYD Blade Battery. 
    The large State of Charge display shows your current battery percentage with a progress bar. 
    Key metrics include Pack Voltage in volts, Current draw in amps, Pack Temperature, and Estimated Range. 
    Below, you'll find three history charts tracking SOC, Voltage, and Temperature over time. 
    The Battery Health Diagnostics section shows State of Health at 94.2%, cell balancing status, insulation resistance, cycle count, and individual cell voltage delta. 
    At the bottom, you'll find the full BYD Blade Battery specifications: 60.48 kilowatt-hour LFP chemistry, 120 cells in series, liquid cooled.`,
  
  device: `Device Information. This page displays details about your connected OBD-II adapter. 
    The status card shows whether the adapter is online or idle, the connection type, and time since last update. 
    Adapter Details section shows the adapter type, firmware version, OBD protocol, and adapter voltage. 
    Signal Strength and Response Time cards provide connection quality metrics. 
    If connected via WiFi, you'll see the adapter IP address, port, and encryption details. 
    The Vehicle Identification section displays the VIN and vehicle specifications. 
    The Firmware Check section compares your current adapter firmware against the latest known version. 
    Compatibility notes at the bottom explain differences between Bluetooth and WiFi adapters.`,
  
  diagnostics: `Vehicle Diagnostics. This page scans your car for fault codes. 
    Tap the Scan button in the top right to begin a diagnostic scan. This reads the ECU for Diagnostic Trouble Codes. 
    The MIL status indicator shows whether the Check Engine Light is on or off. 
    When codes are found, each DTC is displayed with its code, description, and severity status: confirmed, pending, or permanent. 
    You can clear all codes using the Clear All Codes button, but note that this will also clear the ECU readiness monitors. 
    The Emission Monitor Readiness section shows 8 monitored systems with green checkmarks for ready and gray for not ready. 
    Please note that standard OBD-II diagnostics cover powertrain and emissions. For BYD-specific high-voltage diagnostics, a proprietary service tool may be needed.`,
  
  session: `Session Logger and Eco Driving. This page tracks your driving efficiency. 
    The Eco Driving Score is a rating from 0 to 100 based on your acceleration smoothness, braking patterns, speed consistency, and overall energy efficiency. 
    A score above 85 is Excellent, above 70 is Good, above 50 is Average, and below 50 needs improvement. 
    The Score Breakdown shows individual ratings for acceleration, braking, speed, and efficiency. 
    Use the Start Recording button to log session data. When recording, tap Export CSV to download all logged data points for external analysis. 
    The Live Stats grid shows real-time values for speed, power, SOC, regen status, drive mode, and motor temperature. 
    Eco Driving Tips at the bottom provide BYD-specific recommendations to maximize your range.`,
  
  controls: `Vehicle Controls. This page explains the capabilities and limitations of OBD-II for vehicle control. 
    Important: Standard OBD-II is a read-only diagnostic protocol. It cannot send control commands to the vehicle. 
    Seven control items are listed here, including motor start/stop, air conditioning, vehicle movement, door locks, lights, horn, and raw CAN commands. 
    Most controls are marked as Unavailable because they require BYD's proprietary CAN bus protocol, which uses encrypted UDS authentication. 
    The four-step explanation below details why OBD-II cannot control your car and what would be needed. 
    Alternative approaches include using BYD's official DiLink app, aftermarket integration platforms like Carlinkit, or following the XDA Forums BYD development community.`,

  charging: `Charging Monitor. This page tracks your BYD Yuan Plus charging session in real time. 
    The large State of Charge display shows your current battery percentage. When actively charging, a green animation indicates power is flowing into the battery. 
    Three metrics show charging Power in kilowatts, Voltage in volts, and Current in amps. 
    The Time Remaining card shows the estimated minutes until your battery reaches 100 percent. Elapsed time tracks how long the session has been running. 
    Energy Added shows the total kilowatt-hours delivered so far, with charge efficiency percentage. 
    The Charge Session Cost section calculates the cost in Omani Rial and US dollars based on electricity rates. 
    Below, the Charging Power Curve chart shows how power delivery changes over time. LFP batteries maintain constant current until about 78 percent, then taper. 
    The SOC During Charge chart tracks battery percentage. The Battery Temperature chart monitors thermal conditions during charging. 
    Cell Voltage Balance shows the highest and lowest cell voltages and their delta in millivolts. 
    When not charging, you can start a simulation for DC Fast Charge at 60 kilowatts, AC Level 2 at 7.2 kilowatts, or AC Level 1 at 1.8 kilowatts. 
    At the bottom, you'll find the BYD Yuan Plus charging specifications including DC CCS2 and AC Type 2 capabilities.`,
};

export function useVoice() {
  const [enabled, setEnabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const lastSpokenRef = useRef<string>('');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (!enabled) return;

    // Prevent speaking the same page twice in a row
    if (lastSpokenRef.current === text && window.speechSynthesis.speaking) return;

    stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Select a professional English voice, preferring natural/enhanced voices
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) =>
        (v.lang.startsWith('en') || v.lang.startsWith('en-US') || v.lang.startsWith('en-GB')) &&
        (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Natural') || v.name.includes('Enhanced') || v.name.includes('Neural'))
    );
    if (preferred) {
      utterance.voice = preferred;
    } else {
      // Fallback to any English voice
      const anyEnglish = voices.find((v) => v.lang.startsWith('en'));
      if (anyEnglish) utterance.voice = anyEnglish;
    }

    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    lastSpokenRef.current = text;
    window.speechSynthesis.speak(utterance);
  }, [enabled, stop]);

  // Speak page narration when tab changes
  const narratePage = useCallback((tab: string) => {
    const script = PAGE_SCRIPTS[tab];
    if (script) {
      speak(script);
    }
  }, [speak]);

  // Load voices (some browsers load them asynchronously)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
    return () => {
      stop();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [stop]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      if (prev) {
        stop();
      }
      return !prev;
    });
  }, [stop]);

  return { enabled, speaking, toggle, speak, narratePage, stop };
}
