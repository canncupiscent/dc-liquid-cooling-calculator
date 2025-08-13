import React, { useMemo, useState } from 'react'

function numberOr(value, fallback) {
  const v = Number(value);
  return Number.isFinite(v) ? v : fallback;
}

// Coolant property presets at ~25°C (engineering approximations)
const COOLANTS = {
  water: { name: 'Deionized Water', rho: 997, cp: 4.186, mu: 0.00089 },
  eg30: { name: 'Ethylene Glycol 30%', rho: 1045, cp: 3.80, mu: 0.0020 },
  pg30: { name: 'Propylene Glycol 30%', rho: 1038, cp: 3.70, mu: 0.0030 },
};

// Hardware library (nominal TDPs; edit as needed)
const HW_DEVICES = [
  { id: 'nvidia_b200', name: 'NVIDIA Blackwell B200 (SXM)', tdpW: 1000, note: 'Nominal TDP' },
  { id: 'nvidia_h200', name: 'NVIDIA H200 (SXM)', tdpW: 700, note: 'Up to 700 W' },
  { id: 'nvidia_h100', name: 'NVIDIA H100 (SXM5)', tdpW: 700, note: 'Up to 700 W' },
  { id: 'amd_mi300x', name: 'AMD Instinct MI300X (OAM)', tdpW: 750, note: 'Nominal 750 W' },
  { id: 'intel_gaudi3', name: 'Intel Gaudi 3 (OAM)', tdpW: 900, note: 'OAM air 900 W; liquid may be higher' },
];

// Rack archetypes — seeded with GB200 NVL72; extend as needed.
const RACK_ARCHETYPES = [
  { id: 'nvl72', name: 'NVIDIA GB200 NVL72 rack', rackKW: 132, note: 'Reference rack power' },
];

// ASHRAE W-classes: upper limit = class number; lower limit = 2°C
const W_CLASSES = {
  W17: { label: 'W17 (≤17°C)', upper: 17 },
  W27: { label: 'W27 (≤27°C)', upper: 27 },
  W32: { label: 'W32 (≤32°C)', upper: 32 },
  W40: { label: 'W40 (≤40°C)', upper: 40 },
  W45: { label: 'W45 (≤45°C)', upper: 45 },
  Wplus: { label: 'W+ (>45°C)', upper: 999 },
};

function Section({ title, children }) {
  return (
    <div className='rounded-2xl border p-4 md:p-6 shadow-sm bg-white/60'>
      <div className='font-semibold text-lg mb-3'>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, children, help }) {
  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-2 items-center py-1.5'>
      <div className='md:text-right text-sm text-slate-600'>
        <div>{label}</div>
        {help && <div className='text-xs text-slate-400'>{help}</div>}
      </div>
      <div className='md:col-span-2'>{children}</div>
    </div>
  );
}

function Input({ value, onChange, suffix, min, step = 'any' }) {
  return (
    <div className='flex items-center gap-2'>
      <input
        className='w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring'
        type='number'
        inputMode='decimal'
        value={value}
        min={min}
        step={step}
        onChange={(e) => onChange(e.target.value)}
      />
      {suffix && <span className='text-sm text-slate-500 min-w-10 text-right'>{suffix}</span>}
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      className='w-full rounded-xl border px-3 py-2 bg-white focus:outline-none focus:ring'
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Badge({ children }) {
  return <span className='px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs'>{children}</span>;
}

function Status({ level = 'ok', children }) {
  const cls = level === 'ok' ? 'bg-emerald-50 border-emerald-200' : level === 'warn' ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200';
  const dot = level === 'ok' ? 'bg-emerald-500' : level === 'warn' ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className={`rounded-xl border p-3 flex items-start gap-2 ${cls}`}>
      <span className={`mt-1 h-2.5 w-2.5 rounded-full ${dot}`} />
      <div className='text-sm'>{children}</div>
    </div>
  );
}

export default function App() {
  // Thermal inputs
  const [itKW, setItKW] = useState('1000'); // total IT heat to remove [kW]
  const [captureFrac, setCaptureFrac] = useState('1.0'); // fraction captured by liquid loop
  const [supplyC, setSupplyC] = useState('25'); // entering water [°C]
  const [dT, setDT] = useState('10'); // temperature rise [°C]
  const [coolant, setCoolant] = useState('water');
  const [wClass, setWClass] = useState('W32');
  const [coldPlateApproachC, setColdPlateApproachC] = useState('5'); // CPU/GPU→coolant [°C]
  const [cduApproachC, setCduApproachC] = useState('5'); // Facility→CDU secondary [°C]

  // Hydraulics
  const [pipeIDmm, setPipeIDmm] = useState('38'); // internal diameter [mm]
  const [loopLenM, setLoopLenM] = useState('200'); // equivalent length [m]
  const [roughnessMM, setRoughnessMM] = useState('0.0015'); // pipe roughness [mm]
  const [kMinor, setKMinor] = useState('20'); // sum of minor loss coefficients
  const [pumpEff, setPumpEff] = useState('0.7'); // pump efficiency

  // Energy
  const [chillerCOP, setChillerCOP] = useState('6.0');

  // Sizing & ROI
  const [cduCapacityKW, setCduCapacityKW] = useState('1500');
  const [rackKW, setRackKW] = useState('60');
  const [redundancy, setRedundancy] = useState('N');
  const [baselineFanKW, setBaselineFanKW] = useState('120');
  const [baselineAirCOP, setBaselineAirCOP] = useState('4.0');

  // Hardware presets
  const [hwMode, setHwMode] = useState('device'); // 'device' | 'rack'
  const [deviceId, setDeviceId] = useState('nvidia_b200');
  const [devicesPerRack, setDevicesPerRack] = useState('8');
  const [itOverhead, setItOverhead] = useState('1.15');
  const [archetypeId, setArchetypeId] = useState('nvl72');
  const [rackCount, setRackCount] = useState('10');

  function loadExample() {
    setItKW('1000'); setCaptureFrac('1.0');
    setSupplyC('30'); setDT('10'); setCoolant('water'); setWClass('W40');
    setColdPlateApproachC('5'); setCduApproachC('5');
    setPipeIDmm('38'); setLoopLenM('200'); setRoughnessMM('0.0015'); setKMinor('20'); setPumpEff('0.7');
    setChillerCOP('6.0'); setCduCapacityKW('1500'); setRackKW('60'); setRedundancy('N');
    setBaselineFanKW('120'); setBaselineAirCOP('4.0');
    setHwMode('device'); setDeviceId('nvidia_b200'); setDevicesPerRack('8'); setItOverhead('1.15');
    setArchetypeId('nvl72'); setRackCount('10');
  }

  const props = COOLANTS[coolant];

  // Derived hardware estimates
  const selectedDevice = HW_DEVICES.find((d) => d.id === deviceId) || HW_DEVICES[0];
  const estRackKW_fromDevice = useMemo(() => {
    const tdpW = numberOr(selectedDevice.tdpW, 700);
    const n = Math.max(1, numberOr(devicesPerRack, 8));
    const overhead = Math.max(1.0, numberOr(itOverhead, 1.15));
    return (tdpW * n * overhead) / 1000; // kW
  }, [selectedDevice, devicesPerRack, itOverhead]);

  const selectedArchetype = RACK_ARCHETYPES.find((r) => r.id === archetypeId) || RACK_ARCHETYPES[0];

  const fleetIT_kW_fromRack = useMemo(() => {
    const rkW = numberOr(rackKW, 0);
    const nR = Math.max(0, numberOr(rackCount, 0));
    return rkW * nR;
  }, [rackKW, rackCount]);

  const results = useMemo(() => {
    const g = 9.80665;
    const IT = Math.max(0, numberOr(itKW, 0));
    const frac = Math.min(1, Math.max(0, numberOr(captureFrac, 1)));
    const qHeat_kW = IT * frac;

    const Cp = numberOr(props.cp, 4.186);
    const rho = numberOr(props.rho, 997);
    const mu = numberOr(props.mu, 0.00089);

    const dT_C = Math.max(0.001, numberOr(dT, 10));

    const mDot_kg_s = qHeat_kW / (Cp * dT_C);
    const qVol_m3_s = mDot_kg_s / rho;
    const qVol_L_min = qVol_m3_s * 1000 * 60;
    const qVol_gpm = qVol_m3_s * 15850.323;

    const D_m = Math.max(1e-4, numberOr(pipeIDmm, 38) / 1000);
    const A_m2 = Math.PI * (D_m ** 2) / 4;
    const v_m_s = qVol_m3_s / A_m2;

    const Re = (rho * v_m_s * D_m) / mu;

    const eps_m = Math.max(0, numberOr(roughnessMM, 0.0015) / 1000);
    let f;
    if (Re < 2300) {
      f = 64 / Math.max(1, Re);
    } else {
      const term = eps_m / (3.7 * D_m) + 5.74 / Math.pow(Re, 0.9);
      f = 0.25 / Math.pow(Math.log10(term), 2);
    }

    const L_m = Math.max(0, numberOr(loopLenM, 0));
    const K = Math.max(0, numberOr(kMinor, 0));

    const dynamicHead = 0.5 * rho * (v_m_s ** 2);
    const deltaP_Pa = (f * (L_m / D_m) + K) * dynamicHead;
    const deltaP_kPa = deltaP_Pa / 1000;
    const head_m = deltaP_Pa / (rho * g);

    const eta = Math.min(0.95, Math.max(0.05, numberOr(pumpEff, 0.7)));
    const pump_kW = (deltaP_Pa * qVol_m3_s) / eta / 1000;

    const COP = Math.max(0.1, numberOr(chillerCOP, 6));
    const chiller_kW = qHeat_kW / COP;
    const tons = qHeat_kW / 3.517;

    const PUE = IT > 0 ? (IT + chiller_kW + pump_kW) / IT : NaN;

    const supply_C = numberOr(supplyC, 25);
    const return_C = supply_C + dT_C;

    const w = W_CLASSES[wClass];
    const within = supply_C >= 2 && supply_C <= w.upper;
    const advisor = {
      within,
      classLabel: w.label,
      msg: within
        ? `Supply ${supply_C.toFixed(1)}°C is inside ${w.label}. Return ${return_C.toFixed(1)}°C.`
        : `Supply ${supply_C.toFixed(1)}°C is outside ${w.label}. Allowed range is 2–${w.upper}°C. Adjust setpoint or class.`,
      level: within ? 'ok' : supply_C < 2 ? 'bad' : 'warn',
      freeCoolingHint: wClass === 'W32' || wClass === 'W40' || wClass === 'W45' || wClass === 'Wplus',
    };

    const cpApproach = Math.max(0, numberOr(coldPlateApproachC, 5));
    const cduApproach = Math.max(0, numberOr(cduApproachC, 5));
    const totalApproach = cpApproach + cduApproach;

    const capPerCDU_kW = Math.max(1, numberOr(cduCapacityKW, 1500));
    const rack_kW = Math.max(1, numberOr(rackKW, 60));
    const racksSupported = Math.floor((capPerCDU_kW) / (rack_kW * Math.max(0.01, Math.min(1, numberOr(captureFrac, 1)))));
    const nNeeded = Math.ceil(((Math.max(0, numberOr(itKW, 0)) * Math.min(1, numberOr(captureFrac, 1)))) / capPerCDU_kW);
    const nWithRedundancy = redundancy === 'N+1' ? nNeeded + 1 : nNeeded;

    const baseCOP = Math.max(0.1, numberOr(baselineAirCOP, 4));
    const baseFan = Math.max(0, numberOr(baselineFanKW, 0));
    const baselineChiller_kW = IT / baseCOP;
    const baselineTotal_kW = IT + baselineChiller_kW + baseFan;
    const liquidTotal_kW = IT + chiller_kW + pump_kW;
    const savings_kW = baselineTotal_kW - liquidTotal_kW;
    const savingsPct = baselineTotal_kW > 0 ? (savings_kW / baselineTotal_kW) * 100 : NaN;

    return {
      qHeat_kW, mDot_kg_s, qVol_m3_s, qVol_L_min, qVol_gpm, v_m_s, Re, f,
      deltaP_kPa, head_m, pump_kW, tons, chiller_kW, PUE, supply_C, return_C,
      advisor, totalApproach, racksSupported, nNeeded, nWithRedundancy,
      baselineChiller_kW, baselineTotal_kW, liquidTotal_kW, savings_kW, savingsPct,
    };
  }, [itKW, captureFrac, dT, pipeIDmm, loopLenM, roughnessMM, kMinor, pumpEff, chillerCOP, coolant, supplyC, wClass, coldPlateApproachC, cduApproachC, cduCapacityKW, rackKW, redundancy, baselineFanKW, baselineAirCOP, props]);

  function Stat({ label, value, unit, precision = 2, hint }) {
    const v = Number.isFinite(value) ? value : NaN;
    const text = Number.isFinite(v) ? v.toFixed(precision) : '—';
    return (
      <div className='rounded-xl border p-3 bg-white'>
        <div className='text-xs text-slate-500'>{label}</div>
        <div className='text-xl font-semibold'>{text} {unit}</div>
        {hint && <div className='text-xs text-slate-400 mt-1'>{hint}</div>}
      </div>
    );
  }

  return (
    <div className='min-h-screen w-full bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900'>
      <div className='max-w-6xl mx-auto px-4 py-6 md:py-10'>
        <div className='flex items-center justify-between mb-6'>
          <h1 className='text-2xl md:text-3xl font-bold'>Liquid Cooling Calculator — v1.1</h1>
          <div className='flex items-center gap-2'>
            <Badge>hardware presets</Badge>
            <button onClick={loadExample} className='rounded-xl border px-3 py-2 bg-white hover:bg-slate-50'>Load example</button>
          </div>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <Section title='Thermal Inputs (Liquid)'>
            <Row label='IT heat load' help='Total server heat to reject into liquid loop'>
              <Input value={itKW} onChange={setItKW} suffix='kW' />
            </Row>
            <Row label='Capture fraction' help='0–1 portion of IT heat absorbed by liquid'>
              <Input value={captureFrac} onChange={setCaptureFrac} suffix='ratio' step={0.01} />
            </Row>
            <Row label='Supply temperature (entering water)'>
              <Input value={supplyC} onChange={setSupplyC} suffix='°C' />
            </Row>
            <Row label='ΔT across loop' help='Return = Supply + ΔT'>
              <Input value={dT} onChange={setDT} suffix='°C' />
            </Row>
            <Row label='Coolant'>
              <Select
                value={coolant}
                onChange={setCoolant}
                options={Object.entries(COOLANTS).map(([value, c]) => ({ value, label: c.name }))}
              />
            </Row>
            <Row label='ASHRAE W-class' help='Controls allowed supply range'>
              <Select
                value={wClass}
                onChange={setWClass}
                options={Object.entries(W_CLASSES).map(([value, w]) => ({ value, label: w.label }))}
              />
            </Row>
            <Row label='Cold plate approach' help='CPU/GPU-to-coolant'>
              <Input value={coldPlateApproachC} onChange={setColdPlateApproachC} suffix='°C' />
            </Row>
            <Row label='CDU approach' help='Facility water to CDU secondary'>
              <Input value={cduApproachC} onChange={setCduApproachC} suffix='°C' />
            </Row>
          </Section>

          <Section title='Hydraulics & Energy Inputs'>
            <Row label='Pipe internal diameter'>
              <Input value={pipeIDmm} onChange={setPipeIDmm} suffix='mm' />
            </Row>
            <Row label='Equivalent loop length' help='Straight length plus fittings equivalent'>
              <Input value={loopLenM} onChange={setLoopLenM} suffix='m' />
            </Row>
            <Row label='Pipe roughness' help='Copper 0.0015, steel 0.045, HDPE 0.007'>
              <Input value={roughnessMM} onChange={setRoughnessMM} suffix='mm' />
            </Row>
            <Row label='Minor loss coefficient ΣK' help='Valves, bends, HX, QDs, manifolds'>
              <Input value={kMinor} onChange={setKMinor} suffix='—' />
            </Row>
            <Row label='Pump efficiency'>
              <Input value={pumpEff} onChange={setPumpEff} suffix='η (0–1)' step={0.01} />
            </Row>
            <Row label='Chiller COP (liquid loop)'>
              <Input value={chillerCOP} onChange={setChillerCOP} suffix='—' step={0.1} />
            </Row>
          </Section>
        </div>

        {/* NEW: Hardware presets */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6'>
          <Section title='Hardware Presets (Devices → Rack)'>
            <Row label='Mode' help='Choose to estimate from device TDPs or a rack archetype'>
              <div className='grid grid-cols-2 gap-2'>
                <button onClick={() => setHwMode('device')} className={`rounded-xl border px-3 py-2 ${hwMode === 'device' ? 'bg-slate-900 text-white' : 'bg-white'}`}>Device</button>
                <button onClick={() => setHwMode('rack')} className={`rounded-xl border px-3 py-2 ${hwMode === 'rack' ? 'bg-slate-900 text-white' : 'bg-white'}`}>Rack</button>
              </div>
            </Row>

            {hwMode === 'device' && (<>
              <Row label='Device'>
                <Select
                  value={deviceId}
                  onChange={setDeviceId}
                  options={HW_DEVICES.map((d) => ({ value: d.id, label: `${d.name} (${d.tdpW} W)` }))}
                />
              </Row>
              <Row label='# devices per rack' help='Total accelerators per rack'>
                <Input value={devicesPerRack} onChange={setDevicesPerRack} suffix='ea' />
              </Row>
              <Row label='IT overhead factor' help='Accounts for CPUs, NICs, PSUs, VRMs'>
                <Input value={itOverhead} onChange={setItOverhead} suffix='×' step={0.01} />
              </Row>
              <div className='rounded-xl border p-3 bg-white'>
                <div className='text-xs text-slate-500'>Estimated rack IT power</div>
                <div className='text-xl font-semibold'>{estRackKW_fromDevice.toFixed(2)} kW</div>
                <div className='flex gap-2 mt-2'>
                  <button onClick={() => setRackKW(estRackKW_fromDevice.toFixed(2))} className='rounded-xl border px-3 py-2 bg-slate-900 text-white'>Set rack kW</button>
                </div>
              </div>
            </>)}

            {hwMode === 'rack' && (<>
              <Row label='Archetype'>
                <Select
                  value={archetypeId}
                  onChange={setArchetypeId}
                  options={RACK_ARCHETYPES.map((r) => ({ value: r.id, label: `${r.name} (${r.rackKW} kW/rack)` }))}
                />
              </Row>
              <div className='rounded-xl border p-3 bg-white'>
                <div className='text-xs text-slate-500'>Preset rack IT power</div>
                <div className='text-xl font-semibold'>{selectedArchetype.rackKW.toFixed(0)} kW</div>
                <div className='flex gap-2 mt-2'>
                  <button onClick={() => setRackKW(String(selectedArchetype.rackKW))} className='rounded-xl border px-3 py-2 bg-slate-900 text-white'>Set rack kW</button>
                </div>
              </div>
            </>)}
          </Section>

          <Section title='Fleet Planner (push to calculator)'>
            <Row label='Rack IT power' help='From presets or manual'>
              <Input value={rackKW} onChange={setRackKW} suffix='kW/rack' />
            </Row>
            <Row label='# racks'>
              <Input value={rackCount} onChange={setRackCount} suffix='racks' />
            </Row>
            <div className='rounded-xl border p-3 bg-white'>
              <div className='text-xs text-slate-500'>Estimated fleet IT power</div>
              <div className='text-xl font-semibold'>{fleetIT_kW_fromRack.toFixed(2)} kW</div>
              <div className='flex gap-2 mt-2'>
                <button onClick={() => setItKW(fleetIT_kW_fromRack.toFixed(2))} className='rounded-xl border px-3 py-2 bg-slate-900 text-white'>Set IT kW</button>
              </div>
            </div>
          </Section>
        </div>

        <div className='grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6'>
          <Section title='Thermal Results'>
            <div className='grid grid-cols-2 gap-3'>
              <Stat label='Heat removed' value={results.qHeat_kW} unit='kW' />
              <Stat label='Return temperature' value={results.return_C} unit='°C' />
              <Stat label='Mass flow' value={results.mDot_kg_s} unit='kg/s' />
              <Stat label='Flow' value={results.qVol_L_min} unit='L/min' />
              <Stat label='Flow' value={results.qVol_gpm} unit='gpm' />
              <Stat label='Velocity' value={results.v_m_s} unit='m/s' />
              <Stat label='Total approach' value={results.totalApproach} unit='°C' />
            </div>
          </Section>

          <Section title='Hydraulics Results'>
            <div className='grid grid-cols-2 gap-3'>
              <Stat label='Reynolds' value={results.Re} unit='—' precision={0} />
              <Stat label='Friction factor f' value={results.f} unit='—' precision={4} />
              <Stat label='ΔP total' value={results.deltaP_kPa} unit='kPa' />
              <Stat label='Head' value={results.head_m} unit='m' />
              <Stat label='Pump power' value={results.pump_kW} unit='kW' />
            </div>
          </Section>

          <Section title='Energy & ROI'>
            <div className='grid grid-cols-2 gap-3'>
              <Stat label='Chiller power (liquid)' value={results.chiller_kW} unit='kW' />
              <Stat label='Cooling tons' value={results.tons} unit='TR' />
              <Stat label='PUE (est)' value={results.PUE} unit='—' precision={3} />
              <Stat label='Baseline chiller (air)' value={results.baselineChiller_kW} unit='kW' />
              <Stat label='Baseline total' value={results.baselineTotal_kW} unit='kW' />
              <Stat label='Liquid total' value={results.liquidTotal_kW} unit='kW' />
              <Stat label='Savings' value={results.savings_kW} unit='kW' />
              <Stat label='Savings' value={results.savingsPct} unit='%' />
            </div>
          </Section>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6'>
          <Section title='Advisors & Sizing'>
            <div className='space-y-2'>
              <Status level={results.advisor.level}>{results.advisor.msg}</Status>
              {results.advisor.freeCoolingHint && (
                <Status level='ok'>Selected class suggests high likelihood of chiller-free or reduced-chiller operation in many climates. Validate against local weather and heat-rejection topology.</Status>
              )}
              <div className='grid grid-cols-2 gap-3 mt-3'>
                <div>
                  <div className='text-xs text-slate-500 mb-1'>CDU capacity (kW)</div>
                  <Input value={cduCapacityKW} onChange={setCduCapacityKW} suffix='kW' />
                </div>
                <div>
                  <div className='text-xs text-slate-500 mb-1'>Avg rack power</div>
                  <Input value={rackKW} onChange={setRackKW} suffix='kW/rack' />
                </div>
                <div>
                  <div className='text-xs text-slate-500 mb-1'>Redundancy</div>
                  <Select value={redundancy} onChange={setRedundancy} options={[{ value: 'N', label: 'N' }, { value: 'N+1', label: 'N+1' }]} />
                </div>
                <div className='rounded-xl border p-3 bg-white'>
                  <div className='text-xs text-slate-500'>Racks per CDU (approx)</div>
                  <div className='text-xl font-semibold'>{results.racksSupported}</div>
                </div>
                <div className='rounded-xl border p-3 bg-white'>
                  <div className='text-xs text-slate-500'>CDUs required</div>
                  <div className='text-xl font-semibold'>{results.nNeeded}</div>
                  <div className='text-xs text-slate-400 mt-1'>With redundancy: {results.nWithRedundancy}</div>
                </div>
              </div>
            </div>
          </Section>

          <Section title='ROI Baseline Inputs'>
            <Row label='Baseline chiller COP (air)'>
              <Input value={baselineAirCOP} onChange={setBaselineAirCOP} suffix='—' step={0.1} />
            </Row>
            <Row label='Fan power avoided' help='Facility-wide air-cooling fan power removed by DLC'>
              <Input value={baselineFanKW} onChange={setBaselineFanKW} suffix='kW' />
            </Row>
            <div className='text-xs text-slate-500 mt-2'>Savings assume baseline includes chiller + fans; liquid case includes pump + liquid chiller only.</div>
          </Section>
        </div>

        <Section title='Formulae (reference)'>
          <div className='text-sm text-slate-600 space-y-1'>
            <div>ṁ = Q̇ / (c_p ΔT), Q̇ in kW, c_p in kJ·kg⁻¹·K⁻¹ → ṁ in kg·s⁻¹</div>
            <div>Q = ṁ/ρ → volumetric flow (m³·s⁻¹); v = Q / A; Re = ρ v D / μ</div>
            <div>f = 64/Re (laminar); Swamee–Jain for turbulent: f = 0.25 / [log₁₀(ε/(3.7D) + 5.74/Re⁰·⁹)]²</div>
            <div>ΔP = (f L/D + ΣK) · (ρ v² / 2); H = ΔP / (ρ g); P_pump = ΔP · Q / η</div>
            <div>TR = kW / 3.517; P_chiller = kW / COP; PUE ≈ (IT + P_chiller + P_pump) / IT</div>
            <div>Rack IT from devices ≈ (#devices × TDP × overhead)/1000</div>
          </div>
        </Section>

        <div className='text-xs text-slate-500 mt-4'>
          Defaults are indicative. Override TDPs, counts, and rack kW with vendor BOMs. Validate W-class vs server specs and CDU datasheets.
        </div>
      </div>
    </div>
  );
}
