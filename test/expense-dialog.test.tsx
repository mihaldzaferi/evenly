// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ExpenseDialog } from '../src/components/ExpenseDialog'
import { useStore } from '../src/store/useStore'

let groupId = ''
beforeEach(() => {
  useStore.setState({ groups: [] })
  groupId = useStore.getState().createGroup({ name: 'Trip', emoji: '✈️', currency: 'EUR', memberNames: ['Ana', 'Ben', 'Chloé'] }).id
})
afterEach(cleanup)

const group = () => useStore.getState().groups.find((g) => g.id === groupId)!

describe('ExpenseDialog', () => {
  it('explains what is missing instead of saving', () => {
    render(<ExpenseDialog group={group()} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }))
    expect(screen.getByText('Give it a name.')).toBeTruthy()
    expect(screen.getByText('Enter an amount, like 12.50.')).toBeTruthy()
    expect(group().expenses).toHaveLength(0)
  })

  it('previews each share and saves the expense', () => {
    let closed = false
    render(<ExpenseDialog group={group()} onClose={() => (closed = true)} />)
    fireEvent.change(screen.getByLabelText('What was it?'), { target: { value: 'Pizza dinner' } })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '10' } })
    // 10.00 split three ways: one person gets the extra cent.
    expect(screen.getAllByText('€3.34')).toHaveLength(1)
    expect(screen.getAllByText('€3.33')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }))
    expect(closed).toBe(true)
    expect(group().expenses[0]).toMatchObject({ title: 'Pizza dinner', amount: 1000, category: 'food' })
  })

  it('blocks exact splits that do not add up, and fills the rest on request', () => {
    render(<ExpenseDialog group={group()} onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('What was it?'), { target: { value: 'Taxi' } })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '30' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Exact' }))
    fireEvent.change(screen.getByLabelText('Ana’s amount'), { target: { value: '12' } })
    expect(screen.getByText(/€18\.00 left to assign/)).toBeTruthy()

    fireEvent.click(screen.getByText('Split the rest equally'))
    expect((screen.getByLabelText('Ben’s amount') as HTMLInputElement).value).toBe('9.00')
    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }))
    expect(group().expenses[0].split).toMatchObject({ mode: 'exact' })
  })
})
