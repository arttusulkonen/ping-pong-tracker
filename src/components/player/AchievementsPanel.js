import React from 'react';
import { FaLock, FaMedal, FaTrophy } from 'react-icons/fa';
import { GiFlame, GiPingPongBat } from 'react-icons/gi';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

const OVERALL_MATCH_THRESHOLDS = [
  10, 20, 50, 100, 200, 500, 1000, 1500, 2000, 2500,
];
const OVERALL_WIN_THRESHOLDS = [
  10, 20, 50, 100, 200, 500, 1000, 1500, 2000, 2500,
];
const OVERALL_STREAK_THRESHOLDS = [5, 10, 15, 20, 25];

const SEASON_MATCH_THRESHOLDS = [5, 10, 20, 50, 100, 150, 200, 250, 300];
const SEASON_WIN_THRESHOLDS = [5, 10, 20, 40, 60, 80, 100, 150, 200];

const TOURNAMENT_THRESHOLDS = [1, 5, 10, 25, 50];

const countSeasonsAtOrAbove = (arr, prop, thr) =>
  arr.filter((a) => a.type === 'seasonFinish' && a[prop] >= thr).length;

const datesForPlace = (arr, place, type) =>
  arr
    .filter((a) => a.type === type && a.place === place)
    .map((a) => a.dateFinished);

const tournamentCount = (arr) =>
  arr.filter((a) => a.type === 'tournamentFinish').length;

export default function AchievementsPanel({
  achievements = [],
  overallMatches = 0,
  overallWins = 0,
  overallMaxStreak = 0,
}) {
  const hasSeason = achievements.some((a) => a.type === 'seasonFinish');
  if (!hasSeason) {
    return (
      <div className='achievements-wrapper text-gray-700'>
        <h3 className='text-xl font-outfit font-bold mb-4'>Achievements</h3>
        <p>No season achievements yet.</p>
      </div>
    );
  }

  const seasonStars = [1, 2, 3].map((pl) => ({
    place: pl,
    color: ['#ffd700', '#c0c0c0', '#cd7f32'][pl - 1],
    dates: datesForPlace(achievements, pl, 'seasonFinish'),
  }));

  const tournStars = [1, 2, 3].map((pl) => ({
    place: pl,
    color: ['#ffd700', '#c0c0c0', '#cd7f32'][pl - 1],
    dates: datesForPlace(achievements, pl, 'tournamentFinish'),
  }));

  const overallMatchMilestones = OVERALL_MATCH_THRESHOLDS.map((thr) => ({
    label: `Played ${thr}+ Matches (Overall)`,
    unlocked: overallMatches >= thr,
    icon: <GiPingPongBat />,
    tooltip:
      overallMatches >= thr
        ? `You have ${overallMatches} total matches (≥ ${thr}).`
        : `Play ${thr} matches to unlock.`,
  }));

  const overallWinMilestones = OVERALL_WIN_THRESHOLDS.map((thr) => ({
    label: `Won ${thr}+ Matches (Overall)`,
    unlocked: overallWins >= thr,
    icon: <FaTrophy />,
    tooltip:
      overallWins >= thr
        ? `You have ${overallWins} total wins (≥ ${thr}).`
        : `Win ${thr} matches to unlock.`,
  }));

  const overallStreakMilestones = OVERALL_STREAK_THRESHOLDS.map((thr) => ({
    label: `Longest Streak ${thr}+ (Overall)`,
    unlocked: overallMaxStreak >= thr,
    icon: <GiFlame />,
    tooltip:
      overallMaxStreak >= thr
        ? `Your best streak is ${overallMaxStreak} (≥ ${thr}).`
        : `Achieve a streak of ${thr} to unlock.`,
  }));

  const seasonMatchMilestones = SEASON_MATCH_THRESHOLDS.map((thr) => {
    const times = countSeasonsAtOrAbove(achievements, 'matchesPlayed', thr);
    return {
      label: `Played ${thr}+ Matches (Single Season)`,
      unlocked: times > 0,
      count: times,
      icon: <GiPingPongBat />,
      tooltip: times
        ? `Reached ${thr}+ matches in ${times} season(s).`
        : `No season with ${thr} matches yet.`,
    };
  });

  const seasonWinMilestones = SEASON_WIN_THRESHOLDS.map((thr) => {
    const times = countSeasonsAtOrAbove(achievements, 'wins', thr);
    return {
      label: `Won ${thr}+ Matches (Single Season)`,
      unlocked: times > 0,
      count: times,
      icon: <FaTrophy />,
      tooltip: times
        ? `Reached ${thr}+ wins in ${times} season(s).`
        : `No season with ${thr} wins yet.`,
    };
  });

  const tPlayed = tournamentCount(achievements);
  const tournamentMilestones = TOURNAMENT_THRESHOLDS.map((thr) => ({
    label: `Played ${thr}+ Tournaments`,
    unlocked: tPlayed >= thr,
    icon: <FaTrophy />,
    tooltip:
      tPlayed >= thr
        ? `You have played ${tPlayed} tournaments (≥ ${thr}).`
        : `Play ${thr} tournaments to unlock.`,
  }));

  const Row = ({ title, items, withCounter = false }) => (
    <div className='mb-4'>
      <h4 className='text-lg font-outfit font-semibold mb-2 text-gray-700'>
        {title}
      </h4>
      <div className='flex flex-wrap gap-4 items-center'>
        {items.map((it, i) => {
          const id = `${title}-${i}`;
          const unlocked = !!it.unlocked || it.dates?.length;
          const count = it.count ?? it.dates?.length ?? 0;
          const color = unlocked ? it.color ?? '#333' : '#ccc';
          const tooltipContent =
            it.tooltip ??
            (unlocked
              ? `${count}× ${title.toLowerCase()}\n${(it.dates || [])
                  .map((d) => `• ${d}`)
                  .join('\n')}`
              : `Locked – ${title}`);

          return (
            <div
              key={i}
              className='relative inline-flex text-3xl'
              data-tooltip-id={id}
              style={{ color }}
            >
              {it.icon ?? <FaMedal />}
              {withCounter && count > 1 && unlocked && (
                <span className='absolute -top-2 -right-3 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs'>
                  {count}
                </span>
              )}
              {!unlocked && (
                <span className='absolute -top-2 -right-2 text-lg text-gray-500'>
                  <FaLock />
                </span>
              )}
              <Tooltip
                id={id}
                content={
                  <div style={{ whiteSpace: 'pre' }}>{tooltipContent}</div>
                }
                place='top'
              />
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className='achievements-wrapper text-gray-700'>
      <h3 className='text-xl font-outfit font-bold mb-4'>Achievements</h3>
      <Row title='Season Podiums' items={seasonStars} withCounter />
      <Row title='Tournament Podiums' items={tournStars} withCounter />
      <Row title='Tournaments Played' items={tournamentMilestones} />
      <Row title='Total Matches (Overall)' items={overallMatchMilestones} />
      <Row title='Total Wins (Overall)' items={overallWinMilestones} />
      <Row
        title='Longest Win Streak (Overall)'
        items={overallStreakMilestones}
      />
      <Row
        title='Matches in a Single Season'
        items={seasonMatchMilestones}
        withCounter
      />
      <Row
        title='Wins in a Single Season'
        items={seasonWinMilestones}
        withCounter
      />
    </div>
  );
}
