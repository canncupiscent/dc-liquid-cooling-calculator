# Data Center Liquid Cooling Calculator

App overview

Single-page React app for sizing and explaining direct liquid cooling (DLC) in data centers. It turns a few inputs into flows, ΔP, pump power, chiller power, PUE, and simple ROI. It also includes hardware presets (GPU/NPU TDPs and rack archetypes) and an ASHRAE W-class setpoint advisor.

Mental model

Inputs → derived loop flow and hydraulics → energy use → KPIs and advisors. Hardware presets feed realistic rack kW and fleet IT kW, which then drive the thermal and hydraulic math.

Layout and controls

The page has six blocks in order:

1) Thermal Inputs (Liquid). Set total IT heat captured by the liquid loop, the entering-water temperature (supply), and loop ΔT. Pick coolant. Select the server’s ASHRAE W-class. Optionally add approach temperatures for cold plates and the CDU.

2) Hydraulics & Energy Inputs. Describe one representative loop: pipe ID, equivalent length, roughness, minor losses (ΣK), pump efficiency, and liquid-loop chiller COP.

3) Hardware Presets.
Device mode: choose a GPU/NPU SKU, set “devices per rack,” and an “IT overhead factor.” The app computes rack IT kW and lets you push it into the calculator.
Rack mode: pick a rack archetype with a known rack kW and push that value.

4) Fleet Planner. Enter rack kW and number of racks. Push the resulting fleet IT kW into the calculator’s “IT heat load.”

5) Results (Thermal, Hydraulics, Energy & ROI). Read off heat removed, mass flow, volumetric flow (L/min and gpm), velocity, Reynolds, friction factor, ΔP and head, pump kW, chiller kW and tons, estimated PUE, and baseline vs liquid energy with savings.

6) Advisors & Sizing.
Setpoint advisor reports whether your supply temperature falls within the chosen W-class. Sizing helper estimates racks per CDU, CDUs required, and N+1 counts.

Field semantics
	•	IT heat load (kW). Total server power you want the liquid loop to remove.
	•	Capture fraction (0–1). Portion of IT heat captured by liquid rather than residual air.
	•	Supply temperature / ΔT. Defines return = supply + ΔT. These govern mass flow for a fixed load.
	•	Coolant. Affects density, viscosity, and heat capacity.
	•	W-class. Validates supply setpoint against server envelope.
	•	Cold plate / CDU approach (°C). Adds realism for component-to-water and facility-to-secondary temperature lifts.
	•	Pipe ID, length, roughness, ΣK. Drive Darcy–Weisbach pressure drop and head.
	•	Pump efficiency. Wire-to-water for pump power.
	•	Chiller COP. Converts cooling load to kW electric on the liquid side.
	•	Baseline COP and fan kW. Define the air-cooling reference for ROI.

Presets (front-end behavior)
	•	Hardware library. Each option carries a nominal TDP. Device mode computes rack kW = devices × TDP × overhead / 1000 and offers a “Set rack kW” button.
	•	Rack archetypes. Each carries a fixed rack kW that you can push.
	•	Fleet planner. Multiplies rack kW by rack count and lets you “Set IT kW.”

What the numbers mean
	•	Mass flow (kg/s) and volumetric flow (L/min, gpm): Required coolant flow to carry the heat across ΔT.
	•	Velocity, Re, friction f: Sanity checks for laminar vs turbulent regime and friction modeling.
	•	ΔP, head, pump kW: Hydraulic cost at the stated flow and geometry.
	•	Chiller kW, tons, PUE: Energy perspective given the COP chosen.
	•	Baseline vs liquid: Simple comparative energy. Baseline = IT + air-side chiller + fans. Liquid = IT + liquid-side chiller + pumps.

Typical workflows

Size a loop for a given rack.
Pick coolant, supply, and ΔT. Use Hardware Presets → Device or Rack to set rack kW. In Fleet Planner set the number of racks and push “Set IT kW.” Read flows, ΔP, pump kW, and CDUs required.

Validate a setpoint against server limits.
Pick the server W-class from the BOM. Enter your planned supply. The advisor flags compliance and returns expected return temperature.

Answer “how many CDUs do we need?”
Enter CDU capacity, rack kW, and redundancy policy. The sizing card shows racks per CDU, CDUs needed, and N+1.

Quantify an energy delta vs air.
Set baseline COP and fan kW. Compare Baseline total vs Liquid total and read savings kW and %.

Guardrails and tips

Keep ΔT reasonable for your cold plates and manifolds. Adjust ΣK upward for quick-disconnects, manifolds, and heat exchangers. Treat default TDPs and rack kW as placeholders; override with the actual BOM. The ROI block is a first-order comparison and ignores controls, partial loads, and heat-reuse credits.

If Re < 2300, expect laminar behavior and higher f at low velocity. If velocity is excessive, ΔP and pump kW will spike—increase pipe ID or ΔT. If the advisor shows “outside W-class,” either drop supply temperature or select the correct class for the hardware.

Quick start in the UI

Click Load example, then change W-class to match your target server, set supply to 30–40 °C if W32–W40 gear, set ΔT to 10 °C, use Device mode with 8 accelerators and 1.15 overhead, push rack kW, set racks, push IT kW, and read results.


## App Specifications

Vite + React + Tailwind app that sizes and compares direct liquid cooling loops with ASHRAE W-class advisor, CDU sizing, hardware presets, and ROI vs air baseline.

## Quick start

```bash
# macOS (Node 18+ recommended)
npm install
npm run dev
```

Open the local URL printed by Vite.

## Build

```bash
npm run build
npm run preview
```

## Tech
- React 18 + Vite 5
- TailwindCSS 3
- Single-page app; no backend

## License
MIT

## Glossary

ASHRAE W-class: Water-side inlet temperature envelope for liquid-cooled IT (e.g., W27 ≤27 °C, W32 ≤32 °C). Used to validate supply setpoints.
Baseline chiller COP (air): Coefficient of performance assumed for the air-cooled reference system; kWᶜᵒᵒˡ/kWᵉˡᵉᶜ.
Baseline total (kW): IT + air-side chiller power + fan power; reference energy.
CDU (Coolant Distribution Unit): Liquid-to-liquid heat exchanger and pumping skid between facility water and rack loop.
CDU approach (°C): Facility water to CDU secondary temperature “lift” across the HX.
CDU capacity (kW): Max heat rejection of a CDU at specified ΔT and flow.
Capture fraction (0–1): Portion of IT heat removed by the liquid loop (remainder goes to air).
Chiller COP (liquid): Coefficient of performance used to convert liquid cooling load to kW electric.
Cold plate: Device cooling block mounted on CPUs/GPUs.
Cold-plate approach (°C): Junction-to-coolant temperature offset across the cold plate.
Cooling tons (TR): Cooling capacity in tons of refrigeration; 1 TR ≈ 3.517 kW.
Coolant: Working fluid (water/EG/PG mix) with density ρ, viscosity μ, specific heat cₚ.
ΔT (loop) (°C): Return minus supply temperature in the rack loop.
Devices per rack: Number of accelerators (GPUs/NPUs) in one rack.
Dry-break quick disconnect (QD): Dripless coupling used for service; adds minor losses (ΣK).
Dynamic head (Pa): ½ ρ v² term used in pressure-loss calculations.
Energy savings (kW, %): Baseline total minus liquid total, absolute and as percent of baseline.
Equivalent loop length (m): Straight pipe length plus fitting equivalents used in Darcy–Weisbach.
Fleet IT power (kW): Rack kW × number of racks; pushed into IT heat load.
Flow (L/min, gpm): Volumetric coolant flow required to carry the load at the chosen ΔT.
Friction factor (f): Dimensionless loss coefficient; 64/Re (laminar) or Swamee–Jain (turbulent).
Head (m): Pressure drop expressed as meters of fluid: H = ΔP/(ρg).
Hydraulic minor losses (ΣK): Sum of localized loss coefficients for valves, bends, manifolds, QDs, HX.
IT heat load (kW): Power to be removed by cooling; equals server electrical input at steady state.
IT overhead factor (×): Multiplier to include CPUs/VRMs/PSUs/NICs when estimating rack kW from accelerator TDP.
Manifold: Rack or chassis distribution header for supply/return branches.
Mass flow (kg/s): ṁ = Q̇/(cₚΔT); coolant mass rate needed for the load.
NVL72 rack archetype: Preset rack configuration with nominal rack kW for quick sizing.
Pipe internal diameter (mm): Hydraulic diameter used for velocity, Re, and friction.
Pipe roughness (mm): Surface roughness ε; affects turbulent friction.
PUE (Power Usage Effectiveness): (IT + facility energy)/IT; here estimated as (IT + chiller + pumps)/IT.
Pump efficiency (η): Wire-to-water efficiency used to convert hydraulic power to electrical power.
Pump power (kW): P = ΔP·Q/η; electrical power to move the coolant.
Rack IT power (kW/rack): Estimated or preset per-rack IT load used for CDU and fleet sizing.
Racks per CDU: Approximate rack count a single CDU can support at given rack kW and capture fraction.
Redundancy (N / N+1): Sizing policy; N+1 adds one standby CDU beyond minimum needed.
Reynolds number (Re): ρvD/μ; determines laminar vs turbulent regime.
Return temperature (°C): Supply + ΔT at the rack loop outlet back to CDU.
ΣK (sum of K): See hydraulic minor losses.
Specific heat (cₚ): Heat capacity per mass; drives mass-flow requirement.
Supply temperature (°C): Entering water temperature to the IT cold plates.
TDP (Thermal Design Power): Nominal device heat to be removed; basis for device-mode rack estimates.
Velocity (m/s): Flow speed in the pipe: v = Q/A; affects Re and pressure drop.
Viscosity (μ): Coolant dynamic viscosity; affects Re and friction.
Volumetric flow (Q) (m³/s): ṁ/ρ; often shown as L/min or gpm.
W-plus (W+): Class indicating operation above 45 °C entering water when qualified hardware is used.
Water density (ρ): Mass per volume; needed for Re, head, and flow conversions.
ΔP (pressure drop) (kPa): Total loop pressure loss from friction and minor losses.
ΔT (approach, total): Cold-plate + CDU approaches; indicative end-to-end thermal overhead.
