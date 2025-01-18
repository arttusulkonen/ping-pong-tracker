import React from 'react';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

import { FaLock, FaMedal, FaTrophy } from 'react-icons/fa';
import { GiFlame, GiPingPongBat } from 'react-icons/gi';

const OVERALL_MATCH_THRESHOLDS = [10, 20, 50, 100, 200, 500, 1000, 1500, 2000, 2500];
const OVERALL_WIN_THRESHOLDS = [10, 20, 50, 100, 200, 500, 1000, 1500, 2000, 2500];
const OVERALL_STREAK_THRESHOLDS = [5, 10, 15, 20, 25];

const SEASON_MATCH_THRESHOLDS = [5, 10, 20, 50, 100, 150, 200, 250, 300];
const SEASON_WIN_THRESHOLDS = [5, 10, 20, 40, 60, 80, 100, 150, 200];

function countSeasonsAtOrAbove(achievements, prop, threshold) {
  let count = 0;
  achievements.forEach((ach) => {
    if (ach.type === 'seasonFinish') {
      if (ach[prop] >= threshold) {
        count++;
      }
    }
  });
  return count;
}

export default function AchievementsPanel({
  achievements = [],
  overallMatches = 0, 
  overallWins = 0,
  overallMaxStreak = 0, 
}) {
  const hasSeasonAchievements = achievements.some(
    (ach) => ach.type === 'seasonFinish'
  );
  if (!achievements || achievements.length === 0 || !hasSeasonAchievements) {
    return (
      <div className='achievements-wrapper text-gray-700'>
        <h3 className='text-xl font-outfit font-bold mb-4'>Achievements</h3>
        <p>No season achievements yet.</p>
      </div>
    );
  }

  let firstPlaces = 0;
  let secondPlaces = 0;
  let thirdPlaces = 0;

  achievements.forEach((ach) => {
    if (ach.type === 'seasonFinish') {
      if (ach.place === 1) firstPlaces++;
      if (ach.place === 2) secondPlaces++;
      if (ach.place === 3) thirdPlaces++;
    }
  });

  const starData = [
    {
      label: '1st Place Finishes',
      color: '#ffd700', // gold
      count: firstPlaces,
      tooltip: 'Finished in 1st place',
    },
    {
      label: '2nd Place Finishes',
      color: '#c0c0c0', // silver
      count: secondPlaces,
      tooltip: 'Finished in 2nd place',
    },
    {
      label: '3rd Place Finishes',
      color: '#cd7f32', // bronze
      count: thirdPlaces,
      tooltip: 'Finished in 3rd place',
    },
  ];

  const overallMatchMilestones = OVERALL_MATCH_THRESHOLDS.map((thr) => {
    const unlocked = overallMatches >= thr;
    return {
      label: `Played ${thr}+ Matches (Overall)`,
      unlocked,
      icon: <GiPingPongBat />,
      tooltip: unlocked
        ? `You have ${overallMatches} total matches (threshold was ${thr}).`
        : `You haven't reached ${thr} total matches yet.`,
    };
  });
  const overallWinMilestones = OVERALL_WIN_THRESHOLDS.map((thr) => {
    const unlocked = overallWins >= thr;
    return {
      label: `Won ${thr}+ Matches (Overall)`,
      unlocked,
      icon: <FaTrophy />,
      tooltip: unlocked
        ? `You have ${overallWins} total wins (threshold was ${thr}).`
        : `You haven't reached ${thr} total wins yet.`,
    };
  });
  const overallStreakMilestones = OVERALL_STREAK_THRESHOLDS.map((thr) => {
    const unlocked = overallMaxStreak >= thr;
    return {
      label: `Longest Streak of ${thr}+ (Overall)`,
      unlocked,
      icon: <GiFlame />,
      tooltip: unlocked
        ? `You have an overall max streak of ${overallMaxStreak} (threshold: ${thr}).`
        : `You haven't reached a streak of ${thr} overall yet.`,
    };
  });

  const seasonMatchMilestones = SEASON_MATCH_THRESHOLDS.map((thr) => {
    const times = countSeasonsAtOrAbove(achievements, 'matchesPlayed', thr);
    const unlocked = times > 0;
    return {
      label: `Played ${thr}+ Matches (Single Season)`,
      count: times,
      unlocked,
      icon: <GiPingPongBat />,
      tooltip: unlocked
        ? `You have ${times} season(s) with at least ${thr} matches played!`
        : `No season reached ${thr} matches played.`,
    };
  });

  const seasonWinMilestones = SEASON_WIN_THRESHOLDS.map((thr) => {
    const times = countSeasonsAtOrAbove(achievements, 'wins', thr);
    const unlocked = times > 0;
    return {
      label: `Won ${thr}+ Matches (Single Season)`,
      count: times,
      unlocked,
      icon: <FaTrophy />,
      tooltip: unlocked
        ? `You have ${times} season(s) with at least ${thr} wins!`
        : `No season reached ${thr} wins.`,
    };
  });

  const renderMilestoneRow = (title, items, showCountBubble = false) => {
    return (
      <div className='mb-4'>
        <h4 className='text-lg font-outfit font-semibold mb-2 text-gray-700'>
          {title}
        </h4>
        <div className='flex flex-wrap items-center gap-4'>
          {items.map((item, idx) => {
            const color = item.unlocked ? '#333' : '#ccc';
            const tooltipId = `${title}-mile-${idx}`;

            return (
              <div
                key={idx}
                className='relative inline-flex items-center text-3xl'
                data-tooltip-id={tooltipId}
                style={{ color }}
              >
                {item.icon}
                {item.unlocked && showCountBubble && item.count > 1 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-0.5rem',
                      right: '-0.8rem',
                      backgroundColor: 'red',
                      color: 'white',
                      borderRadius: '9999px',
                      width: '1.2rem',
                      height: '1.2rem',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {item.count}
                  </span>
                )}
                {!item.unlocked && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-0.6rem',
                      right: '-0.7rem',
                      fontSize: '1rem',
                      color: '#777',
                    }}
                  >
                    <FaLock />
                  </span>
                )}
                <Tooltip
                  id={tooltipId}
                  content={
                    item.unlocked
                      ? `${item.tooltip}${showCountBubble && item.count > 1 ? ` (x${item.count})` : ''}`
                      : item.tooltip
                  }
                  place='top'
                  style={{ zIndex: 999999 }}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className='achievements-wrapper text-gray-700'>
      <h3 className='text-xl font-outfit font-bold mb-4'>Achievements</h3>

      <div className='mb-4'>
        <h4 className='text-lg font-outfit font-semibold mb-2 text-gray-700'>
          Top Places
        </h4>
        <div className='flex flex-wrap items-center gap-4'>
          {starData.map((star, idx) => {
            const isUnlocked = star.count > 0;
            const color = isUnlocked ? star.color : '#ccc';
            const tooltipId = `star-${idx}`;

            return (
              <div
                key={idx}
                className='relative inline-flex items-center text-3xl'
                data-tooltip-id={tooltipId}
                style={{ color }}
              >
                <FaMedal />
                {isUnlocked && star.count > 1 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-0.5rem',
                      right: '-0.8rem',
                      backgroundColor: 'red',
                      color: 'white',
                      borderRadius: '9999px',
                      width: '1.2rem',
                      height: '1.2rem',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {star.count}
                  </span>
                )}
                {!isUnlocked && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-0.6rem',
                      right: '-0.7rem',
                      fontSize: '1rem',
                      color: '#777',
                    }}
                  >
                    <FaLock />
                  </span>
                )}
                <Tooltip
                  id={tooltipId}
                  content={
                    isUnlocked
                      ? `${star.tooltip} (x${star.count})`
                      : `No ${star.label}`
                  }
                  place='top'
                  style={{ zIndex: 999999 }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {renderMilestoneRow('Total Matches (Overall)', overallMatchMilestones)}
      {renderMilestoneRow('Total Wins (Overall)', overallWinMilestones)}
      {renderMilestoneRow(
        'Longest Win Streak (Overall)',
        overallStreakMilestones
      )}

      {renderMilestoneRow(
        'Matches in a Single Season',
        seasonMatchMilestones,
        true 
      )}
      {renderMilestoneRow(
        'Wins in a Single Season',
        seasonWinMilestones,
        true 
      )}
    </div>
  );
}
