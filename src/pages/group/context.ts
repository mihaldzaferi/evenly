import { useOutletContext } from 'react-router'
import type { Expense, Group, Settlement, Transfer } from '../../lib/types'

/** What GroupPage hands down to its tabs. */
export interface GroupContext {
  group: Group
  openExpense: (expense?: Expense) => void
  openPayment: (opts?: { settlement?: Settlement; prefill?: Transfer }) => void
}

export const useGroupContext = () => useOutletContext<GroupContext>()
