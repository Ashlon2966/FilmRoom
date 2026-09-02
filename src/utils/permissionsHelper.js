/**
 * Permissions Engine for FilmRoom
 * Evaluates department-level access based on user role assignments.
 */

export const ROLES = {
  DIRECTOR: 'Director',
  WRITER: 'Scriptwriter',
  PRODUCER: 'Producer',
  CINEMATOGRAPHER: 'Cinematographer',
  SOUND: 'Sound Designer',
  EDITOR: 'Editor',
  ACTOR: 'Actor',
};

export const canManageRoom = (userRoles = []) => {
  const allowed = [ROLES.DIRECTOR, ROLES.PRODUCER];
  return userRoles.some((r) => allowed.includes(r));
};

export const canEditScreenplay = (userRoles = []) => {
  const allowed = [ROLES.WRITER, ROLES.DIRECTOR, ROLES.PRODUCER];
  return userRoles.some((r) => allowed.includes(r));
};

export const canLogTakes = (userRoles = []) => {
  const allowed = [ROLES.DIRECTOR, ROLES.CINEMATOGRAPHER, ROLES.PRODUCER];
  return userRoles.some((r) => allowed.includes(r));
};

export const canManageSound = (userRoles = []) => {
  const allowed = [ROLES.SOUND, ROLES.DIRECTOR, ROLES.PRODUCER];
  return userRoles.some((r) => allowed.includes(r));
};