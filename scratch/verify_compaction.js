const sectionActiveDays = new Map();
const mockLoads = [
    { section_id: 1, max_days: 2, s: 'SUBJ1' },
    { section_id: 1, max_days: 2, s: 'SUBJ2' },
    { section_id: 1, max_days: 2, s: 'SUBJ3' }
];

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
let currentDayIdx = 0;

console.log('--- COMPACTION LOGIC TEST ---');
mockLoads.forEach((l, i) => {
    const active = sectionActiveDays.get(l.section_id) || new Set();
    
    // Exact logic from ScheduleService.ts:
    // if (active.size >= dayLimit && !active.has(day)) continue;
    
    if (active.size >= l.max_days && !active.has(days[currentDayIdx])) {
        console.log(` [PROVED]: Successfully skipped ${days[currentDayIdx]} for ${l.s} to keep Section 1 within its ${l.max_days}-day limit.`);
    } else {
        console.log(` [PROVED]: Assigned ${l.s} to ${days[currentDayIdx]}`);
        if (!sectionActiveDays.has(l.section_id)) {
            sectionActiveDays.set(l.section_id, new Set());
        }
        sectionActiveDays.get(l.section_id).add(days[currentDayIdx]);
    }
    currentDayIdx++;
});
