'use client';

import 'temporal-polyfill/global';
import { useNextCalendarApp, ScheduleXCalendar } from '@schedule-x/react';
import { createEventsServicePlugin } from '@schedule-x/events-service';
import { viewMonthGrid, viewWeek, viewDay, viewList } from '@schedule-x/calendar';
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Schedule-X writes --sx-week-grid-height (default 1600px) and
 * --sx-week-grid-hour-height on document.documentElement (:root).
 *
 * We override them on .sx-wrapper so descendant elements resolve our
 * fitted values instead of the 1600px default.
 */
const GRID_STEPS = 16; // 07→22 with 60-min step

export interface SxEvent {
    id: string;
    title: string;
    start: Temporal.ZonedDateTime;
    end: Temporal.ZonedDateTime;
    [key: string]: unknown;
}

interface AppCalendarProps {
    events: SxEvent[];
    onEventClick?: (event: SxEvent) => void;
    onDateClick?: (date: Date) => void;
    calendars?: Record<string, { colorName: string; label: string; darkColors: { main: string; container: string; onContainer: string }; lightColors: { main: string; container: string; onContainer: string } }>;
}

export default function AppCalendar({ events, onEventClick, onDateClick, calendars }: AppCalendarProps) {
    const [eventsService] = useState(() => createEventsServicePlugin());
    const wrapperRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number>(0);

    const calendar = useNextCalendarApp(
        {
            views: [viewMonthGrid, viewWeek, viewDay, viewList],
            locale: 'fr-FR',
            firstDayOfWeek: 1,
            isDark: true,
            dayBoundaries: { start: '07:00', end: '22:00' },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(calendars ? { calendars } as any : {}),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            events: events as any,
            callbacks: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onEventClick: onEventClick ? (event: any) => onEventClick(event as SxEvent) : undefined,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClickDate: onDateClick
                    ? (date: any) => onDateClick(new Date(date.year, date.month - 1, date.day))
                    : undefined,
            },
        },
        [eventsService]
    );

    const fitGrid = useCallback(() => {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
            const wrapper = wrapperRef.current;
            if (!wrapper) return;

            const calHeader = wrapper.querySelector('.sx__calendar-header') as HTMLElement | null;
            const weekHeader = wrapper.querySelector('.sx__week-header') as HTMLElement | null;

            if (!calHeader) return; // schedule-x hasn't rendered yet

            const calHeaderH = calHeader.offsetHeight;
            const weekHeaderH = weekHeader?.offsetHeight ?? 0;

            // ── Week / Day view: set CSS vars for grid height ──
            const gridH = Math.max(200, wrapper.clientHeight - calHeaderH - weekHeaderH - 2);
            const hourH = gridH / GRID_STEPS;

            wrapper.style.setProperty('--sx-week-grid-height', `${gridH}px`);
            wrapper.style.setProperty('--sx-week-grid-hour-height', `${hourH}px`);

            // ── Month view: set explicit height on month grid wrapper ──
            const monthGrid = wrapper.querySelector('.sx__month-grid-wrapper') as HTMLElement | null;
            if (monthGrid) {
                const monthH = wrapper.clientHeight - calHeaderH - 2;
                monthGrid.style.height = `${monthH}px`;
            }
        });
    }, []);

    // This effect runs when `calendar` becomes non-null (component renders the wrapper div)
    useEffect(() => {
        if (!calendar) return;

        // Small delay to let schedule-x render its internal DOM
        const initialTimeout = setTimeout(() => {
            const wrapper = wrapperRef.current;
            if (!wrapper) return;

            // ResizeObserver for wrapper size changes
            const ro = new ResizeObserver(fitGrid);
            ro.observe(wrapper);

            // MutationObserver for view switches (month↔week↔day)
            const mo = new MutationObserver(fitGrid);
            mo.observe(wrapper, { childList: true, subtree: true });

            fitGrid();

            // Store cleanup refs
            wrapper.dataset.observersAttached = 'true';
            (wrapper as any)._ro = ro;
            (wrapper as any)._mo = mo;
        }, 50);

        // Also fire fitGrid on a few retries to catch schedule-x async rendering
        const t1 = setTimeout(fitGrid, 200);
        const t2 = setTimeout(fitGrid, 500);
        const t3 = setTimeout(fitGrid, 1000);

        return () => {
            clearTimeout(initialTimeout);
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            cancelAnimationFrame(rafRef.current);
            const wrapper = wrapperRef.current;
            if (wrapper) {
                (wrapper as any)._ro?.disconnect();
                (wrapper as any)._mo?.disconnect();
            }
        };
    }, [calendar, fitGrid]);

    useEffect(() => {
        if (!calendar) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventsService.set(events as any);
    }, [events, calendar]);

    if (!calendar) return null;

    return (
        <div className="sx-wrapper" ref={wrapperRef}>
            <ScheduleXCalendar calendarApp={calendar} />
        </div>
    );
}
