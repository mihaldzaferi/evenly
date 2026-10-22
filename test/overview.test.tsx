// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GroupPage } from '../src/pages/group/GroupPage'
import { OverviewTab } from '../src/pages/group/OverviewTab'
import { useStore } from '../src/store/useStore'
import { expense } from './helpers'

let groupId = ''
beforeEach(() => {
  useStore.setState({ groups: [] })
  const store = useStore.getState()
  const g = store.createGroup({ name: 'Trip', emoji: '✈️', currency: 'EUR', memberNames: ['Ana', 'Ben', 'Chloé'] })
  const [ana, ben, chloe] = g.members.map((m) => m.id)
  groupId = g.id
  // Ana pays 90 for all three: Ben and Chloé each owe her 30.
  store.saveExpense(g.id, expense(ana, 9000, [ana, ben, chloe]))
})
afterEach(cleanup)

function renderOverview() {
  render(
    <MemoryRouter initialEntries={[`/g/${groupId}`]}>
      <Routes>
        <Route path="g/:groupId" element={<GroupPage />}>
          <Route index element={<OverviewTab />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('Overview', () => {
  it('says what you are owed, by whom, and how it adds up', () => {
    renderOverview()
    expect(screen.getByText(/You’re owed/, { selector: 'p' }).textContent).toBe('You’re owed €60.00')
    expect(screen.getByText('Ben and Chloé should pay you back. See below.')).toBeTruthy()
    expect(screen.getByText('2 left ·', { exact: false })).toBeTruthy()
    expect(screen.getAllByText('You paid for the group').length).toBeGreaterThan(0)
  })

  it('moves a payment from "needed" to "made" when it is marked received', () => {
    renderOverview()
    fireEvent.click(screen.getAllByRole('button', { name: 'Mark received' })[0])
    expect(screen.getAllByRole('button', { name: 'Mark received' })).toHaveLength(1)
    expect(screen.getByText('€30.00 paid back so far, €30.00 to go')).toBeTruthy()
    expect(useStore.getState().groups[0].settlements).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Mark received' }))
    expect(screen.getByText('You’re settled up')).toBeTruthy()
    expect(screen.getByText('Everyone’s settled up')).toBeTruthy()
  })

  it('asks who you are when it does not know', () => {
    useStore.getState().updateGroup(groupId, { meId: undefined })
    renderOverview()
    fireEvent.click(screen.getByRole('radio', { name: /Ben/ }))
    expect(screen.getByText(/You owe/, { selector: 'p' }).textContent).toBe('You owe €30.00')
    expect(screen.getByText('Pay Ana €30.00 to settle up.')).toBeTruthy()
  })
})
