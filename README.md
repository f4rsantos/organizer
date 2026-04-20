# Organizer

A local-first academic planner for students. Plan your semester, manage tasks, track grades, and run focus sessions. No cloud account required, no paywalls.

## Goal

Organizer exists to reduce academic overload. It keeps study planning, deadlines, grade tracking, and focus sessions in one place so students can decide faster and work with less friction.

## Features

- Semester planning with dates, holidays, and class setup
- Tasks by week, class, priority, due date, and calendar visibility
- Kanban board with custom columns and checklists
- Grade tracking with components, target grade, and summaries
- Focus timer with interval or scheduled breaks, and optional pomodoro stats
- Portuguese and English UI
- Work mode that hides grades and renames classes to groups
- Quick step-by-step guides on firebase sync and collab

## Customization

Organizer is built to be tailored to your needs, not just used as-is.

**Structure**
- Multiple semesters with per-semester class sets
- Semester dates and holidays

**Tasks**
- Week span behavior for multi-week tasks
- Priority and due date workflow
- Optional calendar visibility per task

**Kanban**
- Add, rename, and remove columns
- Checklist support per card
- Optional inline checklist preview on cards

**Grades**
- Per-class grading components and weights
- Target grade calculation and needed grade panels
- Previous semester values and course average support

**Focus and Pomodoro**
- Interval mode and/or scheduled break mode
- Focus and break custom texts
- Pomodoro mode: grow tomatoes each focus session
- Pomodoro reset period by day, week, month, or semester
- Optional period stats and abandoned session visibility

**Interface**
- Theme and language: Day / Night / System themes, Portuguese or English
- Work mode: Hide grades and make classes be called groups, for people using Organizer for outside university
- Focus alerts and task due alerts: nothing, vibration, notifications, both
- Next day task due reminder

## Collaboration

Organizer Collab is optional and requires Firebase. 

It syncs tasks and kanban cards that you click share, with your entire team.

- Create or join teams through invite links
- Configure invite validity duration
- Host and member roles
- Team-level or personal task completion options
- Team-level edit permissions: anyone or host only
- Leave or delete team flows with control over local shared task cleanup

Collab changes your Firebase requirements. When enabled, Firestore rules must be auth-based and anonymous auth must be available. Regular sync continues to work under that model.

## Optional Features

- JSON backup and restore
- Share link and QR export of your current state
- Firebase sync across devices
- Organizer Collab for team workflows
- PWA install support in production builds

## Privacy and Data

By default, your data stays in browser localStorage. No sign-in is required for local use.

If you enable Firebase sync, the app stores your full state in your own Firestore project. Sync runs automatically after changes, on app focus, and at intervals.

Firebase privacy is your responsibility as the project owner. Do not share it with anyone you do not trust.

Organizer Collab requires Firebase and anonymous auth. Team state is stored in Firestore team documents.

Share links and QR codes encode your data directly in the URL. Only share them with people who should have that data.

JSON exports are full backups. Treat them as sensitive files.
