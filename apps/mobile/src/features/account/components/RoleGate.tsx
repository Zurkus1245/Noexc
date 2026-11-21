import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import type { Role } from '@noexcuse/contracts';
import { AccountGate } from './AccountGate';

interface RoleGateProps {
  readonly role: Role;
  readonly children: ReactNode;
}

// Route groups are per role; anyone else goes back to the root, which decides where they belong.
export function RoleGate({ role, children }: RoleGateProps) {
  return <AccountGate>{(user) => (user.role === role ? children : <Redirect href="/" />)}</AccountGate>;
}
