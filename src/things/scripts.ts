/**
 * AppleScript sources for Things 3. Field order per row (tab-separated, C-escaped fields):
 * id, title, notes, activationUnix, deadlineUnix, tags, project, area
 */

export function escapeAppleScriptString(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

const SHARED_HELPERS = `
use scripting additions

on escapeField(val)
	if val is missing value then
		return ""
	end if
	try
		set s to val as text
	on error
		return ""
	end try
	set bs to ASCII character 92
	set tabCh to ASCII character 9
	set lf to ASCII character 10
	set cr to ASCII character 13
	set out to ""
	repeat with ch in characters of s
		set c to contents of ch
		if c is bs then
			set out to out & bs & bs
		else if c is tabCh then
			set out to out & bs & "t"
		else if c is lf then
			set out to out & bs & "n"
		else if c is cr then
			set out to out & bs & "n"
		else
			set out to out & c
		end if
	end repeat
	return out
end escapeField

on unixForDate(d)
	if d is missing value then
		return ""
	end if
	try
		set epoch to date "Thursday, January 1, 1970 at 12:00:00 AM"
		set secs to (d - epoch)
		return secs as text
	on error
		return ""
	end try
end unixForDate

on truncateNotes(n, maxLen)
	if n is missing value then
		return ""
	end if
	set s to n as text
	if (length of s) > maxLen then
		return text 1 thru maxLen of s
	end if
	return s
end truncateNotes

on rowForToDo(td, truncNotes)
	tell application "Things3"
		set n to notes of td
		set n to my truncateNotes(n, truncNotes)
		set tagStr to tag names of td as text
		set pn to ""
		try
			set p to project of td
			if p is not missing value then set pn to name of p as text
		end try
		set an to ""
		try
			set a to area of td
			if a is not missing value then set an to name of a as text
		end try
		set act to my unixForDate(activation date of td)
		set due to my unixForDate(due date of td)
		return my escapeField(id of td) & tab & my escapeField(name of td) & tab & my escapeField(n) & tab & act & tab & due & tab & my escapeField(tagStr) & tab & my escapeField(pn) & tab & my escapeField(an)
	end tell
end rowForToDo
`;

function ensureThings(): string {
  return `
tell application "Things3"
	if not running then launch
end tell
delay 0.3
`;
}

export function buildListInboxScript(limit: number): string {
  const lim = Math.floor(Math.max(0, Math.min(100, limit)));
  return `
${SHARED_HELPERS}
${ensureThings()}
tell application "Things3"
	set linesOut to ""
	set idx to 0
	repeat with td in (to dos of list "Inbox")
		if idx is greater than or equal to ${lim} then exit repeat
		set linesOut to linesOut & my rowForToDo(td, 500) & linefeed
		set idx to idx + 1
	end repeat
	return linesOut
end tell
`;
}

export function buildListTodayScript(limit: number): string {
  const lim = Math.floor(Math.max(0, Math.min(100, limit)));
  return `
${SHARED_HELPERS}
${ensureThings()}
tell application "Things3"
	set linesOut to ""
	set idx to 0
	repeat with td in (to dos of list "Today")
		if idx is greater than or equal to ${lim} then exit repeat
		set linesOut to linesOut & my rowForToDo(td, 500) & linefeed
		set idx to idx + 1
	end repeat
	return linesOut
end tell
`;
}

export function buildSearchScript(escapedQuery: string, limit: number): string {
  const lim = Math.floor(Math.max(0, Math.min(100, limit)));
  const q = escapeAppleScriptString(escapedQuery);
  return `
${SHARED_HELPERS}
${ensureThings()}
tell application "Things3"
	set searchQuery to "${q}"
	set matches to every to do whose name contains searchQuery or notes contains searchQuery
	set linesOut to ""
	set idx to 0
	repeat with td in matches
		if idx is greater than or equal to ${lim} then exit repeat
		set linesOut to linesOut & my rowForToDo(td, 500) & linefeed
		set idx to idx + 1
	end repeat
	return linesOut
end tell
`;
}

export type AddTodoScriptParams = {
  title: string;
  notes: string;
  tagNames: string;
  /** "Inbox" | "Today" | "Anytime" | "Someday" */
  listName: string;
  projectName?: string;
  areaName?: string;
  deadlineUnix?: number;
  activationUnix?: number;
};

export function buildAddTodoScript(p: AddTodoScriptParams): string {
  const title = escapeAppleScriptString(p.title);
  const notes = escapeAppleScriptString(p.notes);
  const tags = escapeAppleScriptString(p.tagNames);
  const listName = escapeAppleScriptString(p.listName);
  const proj = p.projectName ? escapeAppleScriptString(p.projectName) : '';
  const area = p.areaName ? escapeAppleScriptString(p.areaName) : '';
  const duePart =
    p.deadlineUnix !== undefined
      ? `
	set epoch to date "Thursday, January 1, 1970 at 12:00:00 AM"
	set due date of newToDo to epoch + (${Math.floor(p.deadlineUnix)})
`
      : '';
  const actPart =
    p.activationUnix !== undefined
      ? `
	set epoch2 to date "Thursday, January 1, 1970 at 12:00:00 AM"
	set activation date of newToDo to epoch2 + (${Math.floor(p.activationUnix)})
`
      : '';

  let makeBlock: string;
  if (p.projectName) {
    makeBlock = `
	set newToDo to make new to do with properties {name:"${title}"} at beginning of project "${proj}"
`;
  } else if (p.areaName) {
    makeBlock = `
	set newToDo to make new to do with properties {name:"${title}"} at beginning of area "${area}"
`;
  } else {
    makeBlock = `
	set newToDo to make new to do with properties {name:"${title}"} at beginning of list "${listName}"
`;
  }

  return `
${SHARED_HELPERS}
${ensureThings()}
tell application "Things3"
${makeBlock}
	if "${notes}" is not "" then set notes of newToDo to "${notes}"
	if "${tags}" is not "" then set tag names of newToDo to "${tags}"
${duePart}
${actPart}
	return my rowForToDo(newToDo, 100000)
end tell
`;
}

export function buildCompleteTodoScript(escapedId: string): string {
  const id = escapeAppleScriptString(escapedId);
  return `
${SHARED_HELPERS}
${ensureThings()}
tell application "Things3"
	set td to to do id "${id}"
	set status of td to completed
	return my escapeField(id of td) & tab & my escapeField(name of td) & tab & my escapeField(status of td as text)
end tell
`;
}

/** Moves the to-do to Trash (Things built-in behavior). */
export function buildDeleteTodoScript(escapedId: string): string {
  const id = escapeAppleScriptString(escapedId);
  return `
${ensureThings()}
tell application "Things3"
	set td to to do id "${id}"
	delete td
end tell
`;
}
