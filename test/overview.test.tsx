// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

const group = () => useStore.getState().groups[0]
const headline = () => screen.getByRole('heading', { name: /^(You owe|You’re owed|You’re settled up)/ }).textContent?.trim()

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

describe('Overview when you are owed', () => {
  it('shows who you are waiting for, and how it adds up', () => {
    renderOverview()
    expect(headline()).toBe('You’re owed €60.00')
    expect(screen.getByText('Waiting for')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /Remind/ })).toHaveLength(2)
    expect(screen.getAllByText('You paid for the group').length).toBeGreaterThan(0)
  })

  it('ticks payments off as they arrive', () => {
    renderOverview()
    fireEvent.click(screen.getAllByRole('button', { name: /Mark received/ })[0])
    expect(screen.getAllByRole('button', { name: /Mark received/ })).toHaveLength(1)
    expect(screen.getByText('€30.00 paid back so far, €30.00 to go')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Mark received/ }))
    expect(headline()).toBe('You’re settled up')
    expect(group().settlements).toHaveLength(2)
  })
})

describe('Overview when you owe', () => {
  beforeEach(() => useStore.getState().updateGroup(groupId, { meId: undefined }))

  it('asks who you are, then shows who to pay', () => {
    renderOverview()
    fireEvent.click(screen.getByRole('radio', { name: /Ben/ }))
    expect(headline()).toBe('You owe €30.00')
    expect(screen.getByText('You need to pay')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pay Ana €30.00' })).toBeTruthy()
    // Chloé's payment to Ana is someone else's business.
    expect(screen.getByText('Payments between others')).toBeTruthy()
  })

  it('pays through Vipps: add the number, copy the amount, mark it paid', async () => {
    const ben = group().members[1].id
    useStore.getState().updateGroup(groupId, { meId: ben })
    renderOverview()
    fireEvent.click(screen.getByRole('button', { name: 'Pay Ana €30.00' }))
    expect(screen.getByText('No number for Ana yet')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Add Ana’s number' }))
    fireEvent.change(screen.getByLabelText(/Mobile number/), { target: { value: '412 34 567' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save details' }))
    expect(group().members[0].phone).toBe('41234567')
    expect(screen.getAllByText('412 34 567').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Copy amount' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copy amount' }).textContent).toContain('Copy amount'))
    expect((navigator.clipboard as unknown as { text: string }).text).toMatch(/^30[.,]00$/)

    fireEvent.click(screen.getByRole('button', { name: /I’ve paid/ }))
    expect(group().settlements[0]).toMatchObject({ from: ben, amount: 3000, note: 'Vipps' })
    expect(headline()).toBe('You’re settled up')
  })

  it('lets you pay part of it', () => {
    useStore.getState().updateGroup(groupId, { meId: group().members[1].id })
    renderOverview()
    fireEvent.click(screen.getByRole('button', { name: 'Pay Ana €30.00' }))
    fireEvent.click(screen.getByRole('button', { name: 'Change amount' }))
    fireEvent.change(screen.getByLabelText('Amount to pay'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: /I’ve paid/ }))
    expect(headline()).toBe('You owe €20.00')
  })
})
