// ─── Complete 200 Badge Definitions (8 Tiers) ───────────────────────────────
// Each badge has: key, name, description, xp, tier, tierName, icon
// Check logic is handled by badgeEngine.js
//
// check.type values:
//   'early_count'        – count of check-ins X+ minutes early
//   'early_consecutive'  – X consecutive early days
//   'streak'             – consecutive attendance days
//   'total_checkins'     – total check-in count
//   'perfect_weeks'      – N consecutive 100% weeks
//   'perfect_months'     – N consecutive 100% months
//   'before_time'        – check-in before HH:MM
//   'first_of_day'       – first person to check in that day
//   'zero_tardies'       – no late marks for N days
//   'day_specific'       – present every [day] for N weeks
//   'rank_top'           – rank in top X%
//   'comeback'           – streak after absence
//   'total_hours'        – total logged hours
//   'badge_count'        – total badges earned
//   'scan_speed'         – QR scan speed
//   'profile_complete'   – profile fully set up
//   'manual'             – manually awarded (system can't auto-check)

export const TIER_NAMES = {
  1: 'Punctuality & Time Management',
  2: 'Consecutive Streaks',
  3: 'Period & Calendar Perfection',
  4: 'Total Volume & Milestones',
  5: 'Tech & System Interaction',
  6: 'Events & Special Occasions',
  7: 'Comebacks & Recovery',
  8: 'Community & Teams',
};

export const TIER_ICONS = {
  1: '⏰', 2: '🔥', 3: '📅', 4: '🏆',
  5: '💻', 6: '🎉', 7: '💪', 8: '👥',
};

export const ALL_BADGES = [
  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 1: Punctuality & Time Management (1–25)
  // ═══════════════════════════════════════════════════════════════════════════
  { key: 'early_bird', name: 'Early Bird', description: 'Checked in 10m before class', xp: 5, tier: 1, check: { type: 'early_count', threshold: 1, minutesBefore: 10 } },
  { key: 'dawn_patrol', name: 'Dawn Patrol', description: 'Check in 30 minutes before start time', xp: 10, tier: 1, check: { type: 'early_count', threshold: 1, minutesBefore: 30 } },
  { key: 'first_arrival', name: 'First Arrival', description: 'Be the very first person to check in on any given day', xp: 10, tier: 1, check: { type: 'first_of_day', threshold: 1 } },
  { key: 'first_of_month', name: 'First of the Month', description: 'Be the first person to check in on the 1st day of the month', xp: 5, tier: 1, check: { type: 'manual' } },
  { key: 'sunrise_scholar', name: 'Sunrise Scholar', description: 'Check in before 7:00 AM', xp: 5, tier: 1, check: { type: 'before_time', time: '07:00', threshold: 1 } },
  { key: 'ahead_of_time', name: 'Ahead of Time', description: 'Check in early for 3 consecutive days', xp: 15, tier: 1, check: { type: 'early_consecutive', threshold: 3 } },
  { key: 'punctuality_champ', name: 'Punctuality Champ', description: 'Accumulate 10 early check-ins', xp: 20, tier: 1, check: { type: 'early_count', threshold: 10, minutesBefore: 1 } },
  { key: 'always_early', name: 'Always Early', description: 'Accumulate 30 early check-ins', xp: 40, tier: 1, check: { type: 'early_count', threshold: 30, minutesBefore: 1 } },
  { key: 'time_master', name: 'Time Master', description: 'Accumulate 50 early check-ins', xp: 60, tier: 1, check: { type: 'early_count', threshold: 50, minutesBefore: 1 } },
  { key: 'early_legend', name: 'Early Legend', description: 'Accumulate 100 early check-ins', xp: 100, tier: 1, check: { type: 'early_count', threshold: 100, minutesBefore: 1 } },
  { key: 'morning_catalyst', name: 'Morning Catalyst', description: 'Check in 15 minutes early on a Monday', xp: 5, tier: 1, check: { type: 'manual' } },
  { key: 'beat_the_clock', name: 'Beat the Clock', description: 'Check in early during severe weather or rain alerts', xp: 10, tier: 1, check: { type: 'manual' } },
  { key: 'zero_delays', name: 'Zero Delays', description: 'Finish an entire calendar month with zero tardies', xp: 50, tier: 1, check: { type: 'zero_tardies', period: 'month' } },
  { key: 'clockwork_precision', name: 'Clockwork Precision', description: 'Check in at the exact same minute 3 days in a row', xp: 15, tier: 1, check: { type: 'manual' } },
  { key: 'early_streak', name: 'Early Streak', description: 'Maintain 5 consecutive days of early check-ins', xp: 20, tier: 1, check: { type: 'early_consecutive', threshold: 5 } },
  { key: 'sub_five_swift', name: 'Sub-Five Swift', description: 'Check in between 1 and 5 minutes before the start bell', xp: 5, tier: 1, check: { type: 'early_count', threshold: 1, minutesBefore: 1, minutesMax: 5 } },
  { key: 'ten_minute_titan', name: 'Ten-Minute Titan', description: 'Accumulate 25 check-ins that are 10+ minutes early', xp: 30, tier: 1, check: { type: 'early_count', threshold: 25, minutesBefore: 10 } },
  { key: 'early_riser', name: 'Early Riser', description: 'Log 10 check-ins prior to 7:30 AM', xp: 20, tier: 1, check: { type: 'before_time', time: '07:30', threshold: 10 } },
  { key: 'punctual_pioneer', name: 'Punctual Pioneer', description: 'Be among the first 5 check-ins of the day 5 times', xp: 15, tier: 1, check: { type: 'manual' } },
  { key: 'zero_tardies_quarter', name: 'Zero Tardies (Quarter)', description: 'Complete an entire quarter without a single late log', xp: 100, tier: 1, check: { type: 'zero_tardies', period: 'quarter' } },
  { key: 'zero_tardies_semester', name: 'Zero Tardies (Semester)', description: 'Complete an entire semester without a single late log', xp: 200, tier: 1, check: { type: 'zero_tardies', period: 'semester' } },
  { key: 'zero_tardies_year', name: 'Zero Tardies (Year)', description: 'Complete an entire year without a single late log', xp: 400, tier: 1, check: { type: 'zero_tardies', period: 'year' } },
  { key: 'timely_return', name: 'Timely Return', description: 'Check in on time immediately following a scheduled break', xp: 5, tier: 1, check: { type: 'manual' } },
  { key: 'precision_pilot', name: 'Precision Pilot', description: 'Log 10 check-ins with exactly 0 minutes delay', xp: 25, tier: 1, check: { type: 'manual' } },
  { key: 'early_bird_elite', name: 'Early Bird Elite', description: 'Accumulate 250 early check-ins overall', xp: 250, tier: 1, check: { type: 'early_count', threshold: 250, minutesBefore: 1 } },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 2: Consecutive Streaks (26–50)
  // ═══════════════════════════════════════════════════════════════════════════
  { key: 'consistent', name: 'Consistent', description: 'Attended 5 straight lectures', xp: 15, tier: 2, check: { type: 'streak', threshold: 5 } },
  { key: 'streak_starter', name: 'Streak Starter', description: 'Maintain a 3-day active attendance streak', xp: 10, tier: 2, check: { type: 'streak', threshold: 3 } },
  { key: 'double_down', name: 'Double Down', description: 'Maintain a 10-day active attendance streak', xp: 25, tier: 2, check: { type: 'streak', threshold: 10 } },
  { key: 'unstoppable', name: 'Unstoppable', description: 'Maintain a 20-day active attendance streak', xp: 40, tier: 2, check: { type: 'streak', threshold: 20 } },
  { key: 'monthly_marathon', name: 'Monthly Marathon', description: 'Maintain a 30-day active attendance streak', xp: 60, tier: 2, check: { type: 'streak', threshold: 30 } },
  { key: 'perseverance', name: 'Perseverance', description: 'Maintain a 50-day active attendance streak', xp: 100, tier: 2, check: { type: 'streak', threshold: 50 } },
  { key: 'ironclad', name: 'Ironclad', description: 'Maintain a 75-day active attendance streak', xp: 150, tier: 2, check: { type: 'streak', threshold: 75 } },
  { key: 'century_club', name: 'Century Club', description: 'Maintain a 100-day active attendance streak', xp: 200, tier: 2, check: { type: 'streak', threshold: 100 } },
  { key: 'unbreakable', name: 'Unbreakable', description: 'Maintain a 150-day active attendance streak', xp: 250, tier: 2, check: { type: 'streak', threshold: 150 } },
  { key: 'titanium_streak', name: 'Titanium Streak', description: 'Maintain a 200-day active attendance streak', xp: 300, tier: 2, check: { type: 'streak', threshold: 200 } },
  { key: 'yearling', name: 'Yearling', description: 'Maintain a 365-day active attendance streak', xp: 500, tier: 2, check: { type: 'streak', threshold: 365 } },
  { key: 'weekly_warrior', name: 'Weekly Warrior', description: 'Maintain an active streak across a full calendar week', xp: 20, tier: 2, check: { type: 'streak', threshold: 7 } },
  { key: 'quarter_master', name: 'Quarter Master', description: 'Maintain an unbroken streak across a 3-month term', xp: 150, tier: 2, check: { type: 'streak', threshold: 90 } },
  { key: 'relentless', name: 'Relentless', description: 'Reach a 40-day attendance streak', xp: 80, tier: 2, check: { type: 'streak', threshold: 40 } },
  { key: 'legendary_streak', name: 'Legendary Streak', description: 'Reach a 250-day attendance streak', xp: 350, tier: 2, check: { type: 'streak', threshold: 250 } },
  { key: 'streak_defender', name: 'Streak Defender', description: 'Rebuild a 5-day streak immediately after losing one', xp: 15, tier: 2, check: { type: 'comeback', threshold: 5 } },
  { key: 'streak_guardian', name: 'Streak Guardian', description: 'Reach a 15-day streak twice in a row', xp: 35, tier: 2, check: { type: 'manual' } },
  { key: 'momentum_builder', name: 'Momentum Builder', description: 'Maintain a 7-day streak starting from a Monday', xp: 20, tier: 2, check: { type: 'manual' } },
  { key: 'streak_architect', name: 'Streak Architect', description: 'Maintain a 60-day unbroken streak', xp: 120, tier: 2, check: { type: 'streak', threshold: 60 } },
  { key: 'immortal_streak', name: 'Immortal Streak', description: 'Reach a 300-day attendance streak', xp: 450, tier: 2, check: { type: 'streak', threshold: 300 } },
  { key: 'five_day_master', name: 'Five-Day Master', description: 'Complete 10 separate 5-day streaks', xp: 50, tier: 2, check: { type: 'manual' } },
  { key: 'ten_day_master', name: 'Ten-Day Master', description: 'Complete 5 separate 10-day streaks', xp: 60, tier: 2, check: { type: 'manual' } },
  { key: 'monthly_master', name: 'Monthly Master', description: 'Complete 3 separate 30-day streaks', xp: 120, tier: 2, check: { type: 'manual' } },
  { key: 'streak_specialist', name: 'Streak Specialist', description: 'Maintain a streak for 4 consecutive full weeks', xp: 40, tier: 2, check: { type: 'streak', threshold: 28 } },
  { key: 'streak_grandmaster', name: 'Streak Grandmaster', description: 'Maintain a 500-day cumulative streak', xp: 500, tier: 2, check: { type: 'streak', threshold: 500 } },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 3: Period & Calendar Perfection (51–75)
  // ═══════════════════════════════════════════════════════════════════════════
  { key: 'perfect_week', name: 'Perfect Week', description: '100% weekly attendance', xp: 20, tier: 3, check: { type: 'perfect_weeks', threshold: 1 } },
  { key: 'flawless_fortnight', name: 'Flawless Fortnight', description: '100% attendance over 2 consecutive weeks', xp: 40, tier: 3, check: { type: 'perfect_weeks', threshold: 2 } },
  { key: 'triple_week', name: 'Triple Week', description: '100% attendance over 3 consecutive weeks', xp: 60, tier: 3, check: { type: 'perfect_weeks', threshold: 3 } },
  { key: 'monthly_perfect', name: 'Monthly Perfect', description: '100% attendance for an entire calendar month', xp: 80, tier: 3, check: { type: 'perfect_months', threshold: 1 } },
  { key: 'bi_monthly_perfection', name: 'Bi-Monthly Perfection', description: '100% attendance for 2 consecutive months', xp: 120, tier: 3, check: { type: 'perfect_months', threshold: 2 } },
  { key: 'quarterly_ace', name: 'Quarterly Ace', description: '100% attendance for a full quarter', xp: 150, tier: 3, check: { type: 'perfect_months', threshold: 3 } },
  { key: 'semester_titan', name: 'Semester Titan', description: '100% attendance for an entire semester', xp: 200, tier: 3, check: { type: 'perfect_months', threshold: 5 } },
  { key: 'annual_standard', name: 'Annual Standard', description: '100% attendance for an entire academic year', xp: 500, tier: 3, check: { type: 'perfect_months', threshold: 10 } },
  { key: 'monday_motivator', name: 'Monday Motivator', description: 'Present every Monday for 4 consecutive weeks', xp: 20, tier: 3, check: { type: 'day_specific', day: 1, weeks: 4 } },
  { key: 'tuesday_trooper', name: 'Tuesday Trooper', description: 'Present every Tuesday for 4 consecutive weeks', xp: 20, tier: 3, check: { type: 'day_specific', day: 2, weeks: 4 } },
  { key: 'midweek_anchor', name: 'Midweek Anchor', description: 'Present every Wednesday for 8 consecutive weeks', xp: 40, tier: 3, check: { type: 'day_specific', day: 3, weeks: 8 } },
  { key: 'thursday_vanguard', name: 'Thursday Vanguard', description: 'Present every Thursday for 4 consecutive weeks', xp: 20, tier: 3, check: { type: 'day_specific', day: 4, weeks: 4 } },
  { key: 'friday_finisher', name: 'Friday Finisher', description: 'Present every Friday for 4 consecutive weeks', xp: 20, tier: 3, check: { type: 'day_specific', day: 5, weeks: 4 } },
  { key: 'weekend_warrior_t3', name: 'Weekend Warrior', description: '100% attendance on all scheduled weekend sessions', xp: 25, tier: 3, check: { type: 'manual' } },
  { key: 'full_house', name: 'Full House', description: 'Attend every scheduled session in a single month', xp: 60, tier: 3, check: { type: 'perfect_months', threshold: 1 } },
  { key: 'seasonal_sweep', name: 'Seasonal Sweep', description: '100% attendance during a summer or winter term', xp: 100, tier: 3, check: { type: 'manual' } },
  { key: 'hat_trick', name: 'Hat Trick', description: 'Complete 3 consecutive full weeks of 100% attendance', xp: 50, tier: 3, check: { type: 'perfect_weeks', threshold: 3 } },
  { key: 'grand_slam', name: 'Grand Slam', description: 'Complete 4 consecutive full months of 100% attendance', xp: 250, tier: 3, check: { type: 'perfect_months', threshold: 4 } },
  { key: 'flawless_record', name: 'Flawless Record', description: 'Zero absences across 6 consecutive months', xp: 300, tier: 3, check: { type: 'perfect_months', threshold: 6 } },
  { key: 'january_jumpstart', name: 'January Jumpstart', description: '100% attendance throughout January', xp: 50, tier: 3, check: { type: 'manual' } },
  { key: 'spring_surge', name: 'Spring Surge', description: '100% attendance during March and April', xp: 100, tier: 3, check: { type: 'manual' } },
  { key: 'midyear_anchor', name: 'Midyear Anchor', description: '100% attendance during June and July', xp: 100, tier: 3, check: { type: 'manual' } },
  { key: 'autumn_standard', name: 'Autumn Standard', description: '100% attendance during September and October', xp: 100, tier: 3, check: { type: 'manual' } },
  { key: 'year_end_finisher', name: 'Year-End Finisher', description: '100% attendance throughout November and December', xp: 100, tier: 3, check: { type: 'manual' } },
  { key: 'perfectionist', name: 'Perfectionist', description: '1 full year with 100% attendance and zero tardies', xp: 750, tier: 3, check: { type: 'manual' } },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 4: Total Volume & Milestones (76–100)
  // ═══════════════════════════════════════════════════════════════════════════
  { key: 'first_step', name: 'First Step', description: 'Complete your 1st check-in on the system', xp: 5, tier: 4, check: { type: 'total_checkins', threshold: 1 } },
  { key: 'high_five', name: 'High Five', description: 'Complete 5 total check-ins', xp: 10, tier: 4, check: { type: 'total_checkins', threshold: 5 } },
  { key: 'getting_started', name: 'Getting Started', description: 'Complete 10 total check-ins', xp: 15, tier: 4, check: { type: 'total_checkins', threshold: 10 } },
  { key: 'quarter_centurion', name: 'Quarter Centurion', description: 'Complete 25 total check-ins', xp: 25, tier: 4, check: { type: 'total_checkins', threshold: 25 } },
  { key: 'half_centurion', name: 'Half Centurion', description: 'Complete 50 total check-ins', xp: 40, tier: 4, check: { type: 'total_checkins', threshold: 50 } },
  { key: 'centurion', name: 'Centurion', description: 'Complete 100 total check-ins', xp: 75, tier: 4, check: { type: 'total_checkins', threshold: 100 } },
  { key: 'double_centurion', name: 'Double Centurion', description: 'Complete 200 total check-ins', xp: 120, tier: 4, check: { type: 'total_checkins', threshold: 200 } },
  { key: 'triple_centurion', name: 'Triple Centurion', description: 'Complete 300 total check-ins', xp: 150, tier: 4, check: { type: 'total_checkins', threshold: 300 } },
  { key: 'quad_centurion', name: 'Quad Centurion', description: 'Complete 400 total check-ins', xp: 175, tier: 4, check: { type: 'total_checkins', threshold: 400 } },
  { key: 'high_five_hundred', name: 'High Five Hundred', description: 'Complete 500 total check-ins', xp: 200, tier: 4, check: { type: 'total_checkins', threshold: 500 } },
  { key: 'seven_fifty', name: 'Seven-Fifty', description: 'Complete 750 total check-ins', xp: 250, tier: 4, check: { type: 'total_checkins', threshold: 750 } },
  { key: 'kilometer_club', name: 'Kilometer Club', description: 'Complete 1,000 total check-ins', xp: 300, tier: 4, check: { type: 'total_checkins', threshold: 1000 } },
  { key: 'fifteen_hundred', name: 'Fifteen Hundred', description: 'Complete 1,500 total check-ins', xp: 350, tier: 4, check: { type: 'total_checkins', threshold: 1500 } },
  { key: 'double_k', name: 'Double K', description: 'Complete 2,000 total check-ins', xp: 400, tier: 4, check: { type: 'total_checkins', threshold: 2000 } },
  { key: 'hall_of_fame', name: 'Hall of Fame', description: 'Complete 3,000 total check-ins', xp: 500, tier: 4, check: { type: 'total_checkins', threshold: 3000 } },
  { key: 'milestone_maker', name: 'Milestone Maker', description: 'Pass 50 total logged hours in the system', xp: 30, tier: 4, check: { type: 'manual' } },
  { key: 'time_investor', name: 'Time Investor', description: 'Pass 200 total logged hours in the system', xp: 75, tier: 4, check: { type: 'manual' } },
  { key: 'hourglass_veteran', name: 'Hourglass Veteran', description: 'Pass 500 total logged hours in the system', xp: 150, tier: 4, check: { type: 'manual' } },
  { key: 'time_lord', name: 'Time Lord', description: 'Pass 1,000 total logged hours in the system', xp: 250, tier: 4, check: { type: 'manual' } },
  { key: 'ten_thousand_club', name: 'Ten Thousand Club', description: 'Pass 2,500 total logged hours in the system', xp: 400, tier: 4, check: { type: 'manual' } },
  { key: 'log_legend', name: 'Log Legend', description: 'Reach 5,000 overall logged hours', xp: 600, tier: 4, check: { type: 'manual' } },
  { key: 'session_collector', name: 'Session Collector', description: 'Complete 50 afternoon or evening sessions', xp: 40, tier: 4, check: { type: 'manual' } },
  { key: 'double_digit_days', name: 'Double Digit Days', description: 'Complete 10 full daily sessions in a month', xp: 20, tier: 4, check: { type: 'total_checkins', threshold: 10 } },
  { key: 'triple_digit_log', name: 'Triple Digit Log', description: 'Reach 100 active attendance entries', xp: 50, tier: 4, check: { type: 'total_checkins', threshold: 100 } },
  { key: 'attendance_paragon', name: 'Attendance Paragon', description: '500 check-ins with over 95% punctuality', xp: 350, tier: 4, check: { type: 'manual' } },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 5: Tech & System Interaction (101–125)
  // ═══════════════════════════════════════════════════════════════════════════
  { key: 'tech_master', name: 'Tech Master', description: 'Unlock locked badges', xp: 10, tier: 5, check: { type: 'badge_count', threshold: 5 } },
  { key: 'profile_pioneer', name: 'Profile Pioneer', description: 'Complete 100% of user profile and avatar setup', xp: 10, tier: 5, check: { type: 'profile_complete' } },
  { key: 'qr_swift', name: 'QR Swift', description: 'Check in using a QR scanner in under 3 seconds', xp: 5, tier: 5, check: { type: 'manual' } },
  { key: 'app_adopted', name: 'App Adopted', description: 'Install and complete the first login on the mobile app', xp: 15, tier: 5, check: { type: 'manual' } },
  { key: 'nfc_ace', name: 'NFC Ace', description: 'Tap in successfully via RFID/NFC card 10 times', xp: 15, tier: 5, check: { type: 'manual' } },
  { key: 'biometric_boss', name: 'Biometric Boss', description: 'Set up and use fingerprint or face check-in', xp: 10, tier: 5, check: { type: 'manual' } },
  { key: 'geofence_hero', name: 'Geofence Hero', description: 'Check in via GPS location-based geofence 5 times', xp: 10, tier: 5, check: { type: 'manual' } },
  { key: 'kiosk_king', name: 'Kiosk King', description: 'Log attendance via a shared physical terminal 20 times', xp: 20, tier: 5, check: { type: 'manual' } },
  { key: 'notification_scout', name: 'Notification Scout', description: 'Enable real-time attendance push alerts', xp: 5, tier: 5, check: { type: 'manual' } },
  { key: 'feedback_hero', name: 'Feedback Hero', description: 'Submit a verified bug report or system feedback', xp: 25, tier: 5, check: { type: 'manual' } },
  { key: 'dashboard_driver', name: 'Dashboard Driver', description: 'Visit the personal analytics dashboard 5 times in a week', xp: 10, tier: 5, check: { type: 'manual' } },
  { key: 'dark_mode_scholar', name: 'Dark Mode Scholar', description: 'Toggle the system UI to dark mode and log a check-in', xp: 5, tier: 5, check: { type: 'manual' } },
  { key: 'sync_specialist', name: 'Sync Specialist', description: 'Link the attendance system with a personal calendar app', xp: 15, tier: 5, check: { type: 'manual' } },
  { key: 'speedy_scanner', name: 'Speedy Scanner', description: 'Check in within 1 second of launching the scanner UI', xp: 10, tier: 5, check: { type: 'manual' } },
  { key: 'badge_collector', name: 'Badge Collector', description: 'Unlock 25 total badges across any tier', xp: 40, tier: 5, check: { type: 'badge_count', threshold: 25 } },
  { key: 'badge_hoarder', name: 'Badge Hoarder', description: 'Unlock 50 total badges across any tier', xp: 75, tier: 5, check: { type: 'badge_count', threshold: 50 } },
  { key: 'badge_legend', name: 'Badge Legend', description: 'Unlock 100 total badges across any tier', xp: 150, tier: 5, check: { type: 'badge_count', threshold: 100 } },
  { key: 'selfie_verifier', name: 'Selfie Verifier', description: 'Complete 5 photo-verified check-ins', xp: 10, tier: 5, check: { type: 'manual' } },
  { key: 'offline_sync', name: 'Offline Sync', description: 'Complete an offline check-in that successfully syncs later', xp: 10, tier: 5, check: { type: 'manual' } },
  { key: 'multi_device', name: 'Multi-Device', description: 'Check in from 2 registered devices in the same week', xp: 10, tier: 5, check: { type: 'manual' } },
  { key: 'early_updater', name: 'Early Updater', description: 'Log in on the same day a new software update is released', xp: 10, tier: 5, check: { type: 'manual' } },
  { key: 'security_first', name: 'Security First', description: 'Enable 2-factor authentication on your user account', xp: 20, tier: 5, check: { type: 'manual' } },
  { key: 'analytics_addict', name: 'Analytics Addict', description: 'View attendance reports 10 weeks in a row', xp: 30, tier: 5, check: { type: 'manual' } },
  { key: 'custom_avatar', name: 'Custom Avatar', description: 'Upload a personalized profile picture', xp: 5, tier: 5, check: { type: 'profile_complete' } },
  { key: 'system_native', name: 'System Native', description: 'Interact with 5 different features in the system UI', xp: 15, tier: 5, check: { type: 'manual' } },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 6: Events, Special Occasions & Conditions (126–150)
  // ═══════════════════════════════════════════════════════════════════════════
  { key: 'birthday_checkin', name: 'Birthday Check-In', description: 'Log attendance on your birthday', xp: 25, tier: 6, check: { type: 'manual' } },
  { key: 'holiday_hustle', name: 'Holiday Hustle', description: 'Log attendance during a scheduled working holiday event', xp: 30, tier: 6, check: { type: 'manual' } },
  { key: 'exam_day_presence', name: 'Exam Day Presence', description: 'Present on all designated exam/assessment days', xp: 40, tier: 6, check: { type: 'manual' } },
  { key: 'workshop_participant', name: 'Workshop Participant', description: 'Log attendance for an optional training or workshop', xp: 20, tier: 6, check: { type: 'manual' } },
  { key: 'orientation_hero', name: 'Orientation Hero', description: 'Present on the first day/orientation session of the term', xp: 15, tier: 6, check: { type: 'manual' } },
  { key: 'closing_ceremony', name: 'Closing Ceremony', description: 'Present on the final official day of the term or year', xp: 15, tier: 6, check: { type: 'manual' } },
  { key: 'storm_survivor', name: 'Storm Survivor', description: 'Log attendance during adverse weather advisory days', xp: 25, tier: 6, check: { type: 'manual' } },
  { key: 'leap_day_special', name: 'Leap Day Special', description: 'Log attendance on February 29th', xp: 50, tier: 6, check: { type: 'manual' } },
  { key: 'new_year_starter', name: 'New Year Starter', description: 'Log attendance on the first operational day of January', xp: 15, tier: 6, check: { type: 'manual' } },
  { key: 'midterm_trooper', name: 'Midterm Trooper', description: '100% attendance during midterm week', xp: 40, tier: 6, check: { type: 'manual' } },
  { key: 'event_regular', name: 'Event Regular', description: 'Attend 5 non-standard or special event sessions', xp: 30, tier: 6, check: { type: 'manual' } },
  { key: 'seminar_scholar', name: 'Seminar Scholar', description: 'Log attendance for 3 guest speaker sessions', xp: 25, tier: 6, check: { type: 'manual' } },
  { key: 'conference_hero', name: 'Conference Hero', description: 'Complete full attendance for a multi-day event', xp: 60, tier: 6, check: { type: 'manual' } },
  { key: 'night_owl', name: 'Night Owl', description: 'Check in during an approved evening or late-shift session', xp: 20, tier: 6, check: { type: 'manual' } },
  { key: 'overtime_extra', name: 'Overtime Extra', description: 'Log attendance beyond standard daily required hours', xp: 20, tier: 6, check: { type: 'manual' } },
  { key: 'rainy_day_regular', name: 'Rainy Day Regular', description: 'Check in on 3 rain-indicated days', xp: 20, tier: 6, check: { type: 'manual' } },
  { key: 'heatwave_hero', name: 'Heatwave Hero', description: 'Check in on high-temperature alert days', xp: 20, tier: 6, check: { type: 'manual' } },
  { key: 'opening_week_ace', name: 'Opening Week Ace', description: 'Present every day during the first week of a new term', xp: 30, tier: 6, check: { type: 'manual' } },
  { key: 'final_week_ace', name: 'Final Week Ace', description: 'Present every day during the final week of a term', xp: 30, tier: 6, check: { type: 'manual' } },
  { key: 'assembly_standard', name: 'Assembly Standard', description: 'Log attendance at a full-group general assembly', xp: 15, tier: 6, check: { type: 'manual' } },
  { key: 'field_event', name: 'Field Event', description: 'Log attendance at an off-site location event', xp: 20, tier: 6, check: { type: 'manual' } },
  { key: 'special_session', name: 'Special Session', description: 'Attend a uniquely flagged or tagged event in the system', xp: 15, tier: 6, check: { type: 'manual' } },
  { key: 'double_session_day', name: 'Double Session Day', description: 'Log attendance twice in one day for separate events', xp: 20, tier: 6, check: { type: 'manual' } },
  { key: 'holiday_eve', name: 'Holiday Eve', description: 'Check in on the business day immediately preceding a holiday', xp: 15, tier: 6, check: { type: 'manual' } },
  { key: 'post_holiday_return', name: 'Post-Holiday Return', description: 'Check in on the business day immediately following a holiday', xp: 15, tier: 6, check: { type: 'manual' } },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 7: Comebacks & Recovery (151–175)
  // ═══════════════════════════════════════════════════════════════════════════
  { key: 'comeback_kid', name: 'Comeback Kid', description: 'Rebuild a 5-day streak immediately following an absence', xp: 20, tier: 7, check: { type: 'comeback', threshold: 5 } },
  { key: 'bounce_back', name: 'Bounce Back', description: '100% attendance the week following an excused absence', xp: 25, tier: 7, check: { type: 'manual' } },
  { key: 'tardy_recovery', name: 'Tardy Recovery', description: '10 consecutive on-time check-ins after being late once', xp: 25, tier: 7, check: { type: 'manual' } },
  { key: 'clean_slate', name: 'Clean Slate', description: '30 consecutive on-time days after a recorded tardy', xp: 60, tier: 7, check: { type: 'manual' } },
  { key: 'resilience', name: 'Resilience', description: 'Return to 100% attendance after a multi-day illness or leave', xp: 35, tier: 7, check: { type: 'manual' } },
  { key: 'streak_revival', name: 'Streak Revival', description: 'Use a "Streak Freeze" or excused pass to save a streak', xp: 15, tier: 7, check: { type: 'manual' } },
  { key: 'second_wind', name: 'Second Wind', description: 'Achieve a 10-day streak in the second half of a term', xp: 30, tier: 7, check: { type: 'manual' } },
  { key: 'punctuality_turnaround', name: 'Punctuality Turnaround', description: 'Improve punctuality rate by 15% month-over-month', xp: 50, tier: 7, check: { type: 'manual' } },
  { key: 'fresh_start', name: 'Fresh Start', description: 'Complete a full perfect week after a week with an absence', xp: 25, tier: 7, check: { type: 'manual' } },
  { key: 'zero_late_turnaround', name: 'Zero Late Turnaround', description: '14 straight days without tardiness following a late mark', xp: 35, tier: 7, check: { type: 'manual' } },
  { key: 'streak_rebuilder', name: 'Streak Rebuilder', description: 'Successfully rebuild a lost streak to 20 days', xp: 45, tier: 7, check: { type: 'comeback', threshold: 20 } },
  { key: 'absence_overcomer', name: 'Absence Overcomer', description: 'Log 20 consecutive check-ins following a long absence', xp: 40, tier: 7, check: { type: 'comeback', threshold: 20 } },
  { key: 'correction_hero', name: 'Correction Hero', description: 'Resolve a pending attendance discrepancy via official request', xp: 15, tier: 7, check: { type: 'manual' } },
  { key: 'late_to_early_shift', name: 'Late-to-Early Shift', description: 'Go from a late check-in to an early check-in the next day', xp: 15, tier: 7, check: { type: 'manual' } },
  { key: 'mid_term_pivot', name: 'Mid-Term Pivot', description: 'Raise attendance rate from under 90% to over 95% in one month', xp: 75, tier: 7, check: { type: 'manual' } },
  { key: 're_engaged', name: 'Re-Engaged', description: 'Check in 5 days in a row after an unexcused absence', xp: 20, tier: 7, check: { type: 'comeback', threshold: 5 } },
  { key: 'persistence_t7', name: 'Persistence', description: 'Complete a term with no unexcused absences after an initial warning', xp: 100, tier: 7, check: { type: 'manual' } },
  { key: 'streak_phoenix', name: 'Streak Phoenix', description: 'Rebuild a streak to 50 days after losing a previous 50-day streak', xp: 150, tier: 7, check: { type: 'manual' } },
  { key: 'prompt_return', name: 'Prompt Return', description: 'Check in on time the very day after an absence', xp: 10, tier: 7, check: { type: 'comeback', threshold: 1 } },
  { key: 'flawless_finish', name: 'Flawless Finish', description: '100% attendance in the final month after early missed days', xp: 75, tier: 7, check: { type: 'manual' } },
  { key: 'steady_climber', name: 'Steady Climber', description: 'Increase total monthly attendance % three months in a row', xp: 60, tier: 7, check: { type: 'manual' } },
  { key: 'tardy_stopper', name: 'Tardy Stopper', description: '60 consecutive days without a late check-in after 2 prior late marks', xp: 100, tier: 7, check: { type: 'manual' } },
  { key: 'recovery_master', name: 'Recovery Master', description: 'Rebuild 3 separate lost streaks back to 10+ days', xp: 60, tier: 7, check: { type: 'manual' } },
  { key: 'focus_returned', name: 'Focus Returned', description: '100% punctuality for 2 weeks after an unexcused late check-in', xp: 30, tier: 7, check: { type: 'manual' } },
  { key: 'iron_will', name: 'Iron Will', description: 'Perfect record during the traditionally lowest-attended month', xp: 75, tier: 7, check: { type: 'manual' } },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 8: Community, Teams & Comparative (176–200)
  // ═══════════════════════════════════════════════════════════════════════════
  { key: 'reliable_peer', name: 'Reliable Peer', description: 'Rank in the top 10% for attendance in your cohort', xp: 60, tier: 8, check: { type: 'rank_top', percentile: 10 } },
  { key: 'model_participant', name: 'Model Participant', description: '100% attendance and 0 tardies over 60 straight days', xp: 120, tier: 8, check: { type: 'manual' } },
  { key: 'top_tier', name: 'Top Tier', description: 'Rank in the top 5% for overall system punctuality', xp: 150, tier: 8, check: { type: 'rank_top', percentile: 5 } },
  { key: 'group_anchor', name: 'Group Anchor', description: 'Help your section reach a 95%+ weekly average', xp: 50, tier: 8, check: { type: 'manual' } },
  { key: 'class_leader', name: 'Class Leader', description: 'Hold the highest total check-in count in your group for a month', xp: 60, tier: 8, check: { type: 'manual' } },
  { key: 'cohort_champion', name: 'Cohort Champion', description: 'Highest attendance rate in your section for a term', xp: 120, tier: 8, check: { type: 'manual' } },
  { key: 'team_player', name: 'Team Player', description: '100% of group members check in on time on a given day', xp: 30, tier: 8, check: { type: 'manual' } },
  { key: 'shared_success', name: 'Shared Success', description: 'Be part of a team that achieves a collective 30-day streak', xp: 80, tier: 8, check: { type: 'manual' } },
  { key: 'punctuality_role_model', name: 'Punctuality Role Model', description: 'Maintain an overall lifetime punctuality rate above 98%', xp: 250, tier: 8, check: { type: 'manual' } },
  { key: 'attendance_elite', name: 'Attendance Elite', description: 'Maintain an overall lifetime attendance rate above 99%', xp: 350, tier: 8, check: { type: 'manual' } },
  { key: 'group_catalyst', name: 'Group Catalyst', description: 'Log early check-ins along with 80% of your group on the same day', xp: 25, tier: 8, check: { type: 'manual' } },
  { key: 'peer_motivator', name: 'Peer Motivator', description: 'Be in the top 3 check-ins of your group 10 times', xp: 35, tier: 8, check: { type: 'manual' } },
  { key: 'perfect_group_week', name: 'Perfect Group Week', description: 'Be part of a group with zero absences for an entire week', xp: 60, tier: 8, check: { type: 'manual' } },
  { key: 'section_standout', name: 'Section Standout', description: 'Earn 5 badges in a single calendar month', xp: 40, tier: 8, check: { type: 'badge_count', threshold: 5 } },
  { key: 'top_one_percent', name: 'Top 1%', description: 'Rank in the top 1% of total system activity overall', xp: 300, tier: 8, check: { type: 'rank_top', percentile: 1 } },
  { key: 'early_group', name: 'Early Group', description: '100% of your sub-group checks in early on the same day', xp: 30, tier: 8, check: { type: 'manual' } },
  { key: 'benchmarker', name: 'Benchmarker', description: 'Exceed average system attendance rate for 3 straight months', xp: 75, tier: 8, check: { type: 'manual' } },
  { key: 'streak_leader', name: 'Streak Leader', description: 'Hold the longest active streak in your group or organization', xp: 100, tier: 8, check: { type: 'manual' } },
  { key: 'consistency_model', name: 'Consistency Model', description: 'Less than 2% variance in daily arrival time over a month', xp: 60, tier: 8, check: { type: 'manual' } },
  { key: 'reliability_standard', name: 'Reliability Standard', description: 'Maintain 95%+ attendance for 3 consecutive years', xp: 500, tier: 8, check: { type: 'manual' } },
  { key: 'punctual_trio', name: 'Punctual Trio', description: 'Check in early alongside 2 team members on the same day', xp: 20, tier: 8, check: { type: 'manual' } },
  { key: 'group_century', name: 'Group Century', description: 'Belong to a group with 100 combined perfect days', xp: 150, tier: 8, check: { type: 'manual' } },
  { key: 'attendance_vanguard', name: 'Attendance Vanguard', description: 'Among the top 10 most punctual individuals all year', xp: 400, tier: 8, check: { type: 'manual' } },
  { key: 'system_veteran', name: 'System Veteran', description: 'Retain an active uninterrupted account for over 2 full years', xp: 250, tier: 8, check: { type: 'manual' } },
  { key: 'apex_attender', name: 'Apex Attender', description: '100% attendance, 0 tardies, and 100+ early check-ins in a year', xp: 600, tier: 8, check: { type: 'manual' } },
];

// Utility: get badge by key
export function getBadgeByKey(key) {
  return ALL_BADGES.find(b => b.key === key);
}

// Utility: get all badges for a tier
export function getBadgesByTier(tier) {
  return ALL_BADGES.filter(b => b.tier === tier);
}
