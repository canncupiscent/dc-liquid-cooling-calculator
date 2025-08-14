// CDU models derived from `technical sheet.md`
// Fields: id, model, type, form, capacityKW, target, redundancy, facilityWater
export const CDU_MODELS = [
  { id: 'CHx2000', model: 'CHx2000', type: 'Liquid-to-Liquid', form: 'Row-Based (Single Rack)', capacityKW: 2000, target: 'Multi-Row (up to 74 racks)', redundancy: 'N+N Pumps', facilityWater: true },
  { id: 'CHx1500', model: 'CHx1500', type: 'Liquid-to-Liquid', form: 'Row-Based (Single Rack)', capacityKW: 1500, target: 'Multi-Row (up to 63 racks)', redundancy: 'N+N Pumps', facilityWater: true },
  { id: 'AHx240', model: 'AHx240', type: 'Liquid-to-Air', form: 'Row-Based (Two Racks)', capacityKW: 240, target: 'Multi-Rack (up to 4 NVL72)', redundancy: '2N Pumps, N+1 Fans', facilityWater: false },
  { id: 'CHx200', model: 'CHx200', type: 'Liquid-to-Liquid', form: '4U Rack-Mount', capacityKW: 200, target: 'Single Rack (up to 200 servers)', redundancy: 'N+1 Pumps', facilityWater: true },
  { id: 'AHx180', model: 'AHx180', type: 'Liquid-to-Air', form: 'Row-Based (Slim Two Racks)', capacityKW: 180, target: 'Multi-Rack (up to 2 NVL72)', redundancy: '2N Pumps, N+1 Fans', facilityWater: false },
  { id: 'CHx80', model: 'CHx80', type: 'Liquid-to-Liquid', form: '4U Rack-Mount', capacityKW: 80, target: 'Single Rack (up to 100 servers)', redundancy: 'N+1 Pumps', facilityWater: true },
  { id: 'AHx10', model: 'AHx10', type: 'Liquid-to-Air', form: '5U Rack-Mount', capacityKW: 10, target: 'Single Rack / Lab', redundancy: 'N+1 Pumps', facilityWater: false },
  { id: 'AHx2', model: 'AHx2', type: 'Liquid-to-Air', form: 'Benchtop', capacityKW: 2, target: 'Test / Validation (up to 4 servers)', redundancy: 'N/A', facilityWater: false },
];
