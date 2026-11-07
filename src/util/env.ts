// REQ-DIST-016 a child that may run npx gets the environment without the two variables of a nested npx.

/** npm sets the first under `npx --package`. A leaked value makes a nested npx run the wrong command. */
export const NESTED_NPX_VARS = ["npm_config_package", "npm_config_call"] as const;

/** REQ-TASK-009 the variables that pick a git repo. A hook sets them. A git child of a project must not see them. */
export const GIT_REPO_VARS = ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_PREFIX"] as const;

/** A copy of `base` without the nested npx variables. It never writes to `base`. */
export function childEnv(base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const copy: NodeJS.ProcessEnv = { ...base };
  for (const k of NESTED_NPX_VARS) delete copy[k];
  return copy;
}
