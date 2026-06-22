// ISO 21101-aligned safety checklists per activity type

export const ACTIVITY_CHECKLISTS = {
  zip_line: [
    'Confirm harness is properly fitted and all clips are locked',
    'Verify carabiner is closed and weight-rated for your body weight',
    'Check that the operator holds a valid adventure tourism license',
    'Confirm backup brake/arrest system is in place on the line',
    'Remove loose items (keys, jewelry, glasses on strap)',
    'Confirm emergency contact is aware of your activity time and location',
    'Acknowledge weather conditions are within operator safety limits',
  ],
  scuba: [
    'Confirm BCD inflator hose is properly connected and inflates',
    'Check all tank valves are fully open and air pressure is sufficient',
    'Verify regulator breathes freely from all stages',
    'Confirm dive buddy assignment and hand signal agreement',
    'Review max depth and no-decompression limits for this dive',
    'Check weight belt release is accessible and unobstructed',
    'Confirm dive computer/table is set and emergency ascent plan agreed',
  ],
  snorkeling: [
    'Confirm mask seal is watertight and fin fit is secure',
    'Check for strong currents or rip tides in the area',
    'Ensure a flotation device is available if needed',
    'Never snorkel alone — buddy system is mandatory',
    'Confirm awareness of boat traffic in the area',
    'Apply reef-safe sunscreen — not petroleum-based products near marine life',
  ],
  atv: [
    'Wear a properly fitted helmet — no exceptions',
    'Check throttle, brakes, and steering before departing',
    'Confirm operator briefed you on route hazards and speed limits',
    'Wear long sleeves/pants and closed-toe footwear',
    'Never ride alone on unfamiliar terrain',
    'Confirm GPS or route map is available',
    'Do not consume alcohol before or during the activity',
  ],
  hiking: [
    'Share your route plan and expected return time with your coordinator',
    'Carry minimum 2L of water per person per 4 hours',
    'Wear appropriate footwear with ankle support',
    'Carry a whistle and basic first aid kit',
    'Check weather forecast — avoid trails during rain or extreme heat',
    'Stay on marked trails only',
    'Charge your phone and enable location sharing',
  ],
  parasailing: [
    'Confirm tow rope has been inspected and rated for your weight',
    'Verify the boat operator is licensed for parasailing operations',
    'Confirm you understand the hand signal system for communication',
    'Do not participate if wind speeds exceed operator safety limits',
    'Ensure harness is fitted and all buckles are double-checked',
    'Confirm emergency lowering procedure with the crew',
  ],
  kayaking: [
    'Wear a properly fitted personal flotation device (PFD) at all times',
    'Check weather and sea/river conditions before launch',
    'Confirm a float plan has been shared with your coordinator',
    'Test paddle grip and seating position before departure',
    'Carry a whistle and waterproof torch/phone',
    'Know the capsize recovery procedure before you go out',
  ],
  yoga: [
    'Inform the instructor of any recent surgeries or physical limitations',
    'Hydrate well before and after each session',
    'Use a non-slip mat on all surfaces',
    'Avoid inverted poses if cleared for less than 4 weeks post-surgery',
    'Stop immediately if you experience dizziness or sharp pain',
  ],
  other: [
    'Confirm the activity operator is licensed and insured',
    'Share your activity schedule with your emergency contact',
    'Carry identification and medical information card',
    'Confirm weather conditions are safe for the activity',
    'Ensure a communication device is charged and accessible',
  ],
};

export const getChecklist = (activityId) => {
  return (ACTIVITY_CHECKLISTS[activityId] || ACTIVITY_CHECKLISTS.other).map(item => ({
    item,
    acknowledged: false,
  }));
};