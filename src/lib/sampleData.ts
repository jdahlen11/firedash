import type { Incident } from '../hooks';

/** Returns a timestamp N minutes ago in ISO format */
function minsAgo(n: number): string {
  return new Date(Date.now() - n * 60000).toISOString();
}

export function getSampleIncidents(): Incident[] {
  return [
    { id: 'INC-001', type: 'ME', time: minsAgo(4),  addr: '1234 N CAHUENGA BLVD, HOLLYWOOD', lat: '34.0928', lng: '-118.3287', agency: 'LAFDW', units: [{ id: 'RA19', status: 'OnScene' }, { id: 'E27', status: 'OnScene' }] },
    { id: 'INC-002', type: 'SF', time: minsAgo(11), addr: '8400 S VERMONT AVE, LOS ANGELES', lat: '33.9723', lng: '-118.2897', agency: 'LAFDS', units: [{ id: 'E67', status: 'OnScene' }, { id: 'T67', status: 'OnScene' }, { id: 'BC17', status: 'OnScene' }, { id: 'RA867', status: 'OnScene' }, { id: 'E18', status: 'Enroute' }] },
    { id: 'INC-003', type: 'TC', time: minsAgo(7),  addr: '405 FWY NB AT SUNSET BLVD, BRENTWOOD', lat: '34.0813', lng: '-118.4591', agency: 'LAFDW', units: [{ id: 'RA83', status: 'Transport' }, { id: 'E263', status: 'OnScene' }] },
    { id: 'INC-004', type: 'ME', time: minsAgo(2),  addr: '12050 VENTURA BLVD, STUDIO CITY', lat: '34.1435', lng: '-118.3995', agency: 'LAFDV', units: [{ id: 'RA70', status: 'Enroute' }, { id: 'E76', status: 'Enroute' }] },
    { id: 'INC-005', type: 'VF', time: minsAgo(18), addr: '6200 WINNETKA AVE, WOODLAND HILLS', lat: '34.1893', lng: '-118.5719', agency: 'LAFDV', units: [{ id: 'E97', status: 'OnScene' }, { id: 'RA97', status: 'OnScene' }] },
    { id: 'INC-006', type: 'ME', time: minsAgo(9),  addr: '3450 W MARTIN LUTHER KING JR BLVD, CRENSHAW', lat: '34.0037', lng: '-118.3382', agency: 'LAFDS', units: [{ id: 'RA2', status: 'TransportArrived' }, { id: 'E42', status: 'Available' }] },
    { id: 'INC-007', type: 'TC', time: minsAgo(22), addr: '710 FWY SB AT SLAUSON AVE, WATTS', lat: '33.9897', lng: '-118.2413', agency: 'LAFDS', units: [{ id: 'RA3', status: 'Transport' }, { id: 'E64', status: 'OnScene' }, { id: 'BC13', status: 'OnScene' }] },
    { id: 'INC-008', type: 'GAS', time: minsAgo(14), addr: '1800 N VINE ST, HOLLYWOOD', lat: '34.1003', lng: '-118.3267', agency: 'LAFDW', units: [{ id: 'E27', status: 'OnScene' }, { id: 'RA19', status: 'Available' }] },
    { id: 'INC-009', type: 'ME', time: minsAgo(6),  addr: '4300 E CESAR CHAVEZ AVE, EAST LA', lat: '34.0415', lng: '-118.1791', agency: 'LAFDC', units: [{ id: 'RA94', status: 'OnScene' }, { id: 'E32', status: 'OnScene' }] },
    { id: 'INC-010', type: 'WSF', time: minsAgo(31), addr: '2600 S FIGUEROA ST, SOUTH PARK', lat: '34.0237', lng: '-118.2742', agency: 'LAFDC', units: [{ id: 'E3', status: 'OnScene' }, { id: 'T3', status: 'OnScene' }, { id: 'RA3', status: 'Available' }, { id: 'BC1', status: 'OnScene' }, { id: 'E9', status: 'OnScene' }, { id: 'E23', status: 'Enroute' }] },
    { id: 'INC-011', type: 'LA', time: minsAgo(3),  addr: '11234 BURBANK BLVD, NORTH HOLLYWOOD', lat: '34.1741', lng: '-118.3829', agency: 'LAFDV', units: [{ id: 'RA68', status: 'OnScene' }] },
    { id: 'INC-012', type: 'ME', time: minsAgo(16), addr: '9000 S NORMANDIE AVE, GARDENA ADJ', lat: '33.9584', lng: '-118.2985', agency: 'LAFDS', units: [{ id: 'RA858', status: 'TransportArrived' }, { id: 'E58', status: 'Available' }] },
    { id: 'INC-013', type: 'FA', time: minsAgo(5),  addr: '350 S GRAND AVE, DOWNTOWN LA', lat: '34.0527', lng: '-118.2552', agency: 'LAFDC', units: [{ id: 'E9', status: 'Enroute' }] },
    { id: 'INC-014', type: 'ME', time: minsAgo(8),  addr: '5200 LANKERSHIM BLVD, NORTH HOLLYWOOD', lat: '34.1637', lng: '-118.3656', agency: 'LAFDV', units: [{ id: 'RA72', status: 'OnScene' }, { id: 'E75', status: 'OnScene' }] },
    { id: 'INC-015', type: 'TCE', time: minsAgo(26), addr: '101 FWY NB AT HIGHLAND AVE, HOLLYWOOD', lat: '34.1022', lng: '-118.3395', agency: 'LAFDW', units: [{ id: 'RA25', status: 'Transport' }, { id: 'E41', status: 'OnScene' }, { id: 'HR3', status: 'OnScene' }, { id: 'BC8', status: 'OnScene' }] },
    { id: 'INC-016', type: 'ME', time: minsAgo(12), addr: '7100 VAN NUYS BLVD, VAN NUYS', lat: '34.1892', lng: '-118.4492', agency: 'LAFDV', units: [{ id: 'RA87', status: 'OnScene' }] },
    { id: 'INC-017', type: 'VEG', time: minsAgo(38), addr: '17000 MULHOLLAND DR, ENCINO', lat: '34.1562', lng: '-118.5312', agency: 'LAFDV', units: [{ id: 'E97', status: 'Available' }, { id: 'E70', status: 'Available' }] },
    { id: 'INC-018', type: 'ME', time: minsAgo(1),  addr: '3800 W CENTURY BLVD, INGLEWOOD ADJ', lat: '33.9587', lng: '-118.3752', agency: 'LAFDS', units: [{ id: 'RA826', status: 'Dispatched' }, { id: 'E26', status: 'Dispatched' }] },
    { id: 'INC-019', type: 'EE', time: minsAgo(20), addr: '1100 S HOPE ST, DOWNTOWN LA', lat: '34.0433', lng: '-118.2619', agency: 'LAFDC', units: [{ id: 'E11', status: 'OnScene' }] },
    { id: 'INC-020', type: 'ME', time: minsAgo(35), addr: '4801 WHITTIER BLVD, EAST LA', lat: '34.0201', lng: '-118.1823', agency: 'LAFDC', units: [{ id: 'RA246', status: 'TransportArrived' }, { id: 'E46', status: 'Available' }] },
  ];
}
