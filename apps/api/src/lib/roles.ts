export const MASTER_LOGIN = "guilherme.sanches";

export type OperatorRole = "master" | "consignador";

export function isMasterLogin(login: string): boolean {
  return login.trim().toLowerCase() === MASTER_LOGIN;
}

export function isMaster(operator: { login: string; role?: OperatorRole }): boolean {
  return operator.role === "master" || isMasterLogin(operator.login);
}
