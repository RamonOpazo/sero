import { useState } from 'react'
import { DataTable, createColumn, Actions } from '@/components/features/data-table'
import type { Column } from '@/components/features/data-table'

interface User {
  id: number
  name: string
  email: string
  status: string
}

const sampleData: User[] = [
  {
    id: 1,
    name: "Alice Johnson",
    email: "alice@example.com", 
    status: "active",
  },
  {
    id: 2,
    name: "Bob Smith",
    email: "bob@example.com",
    status: "inactive",
  },
]

export function ActionsColumnExample() {
  const [data, setData] = useState<User[]>(sampleData)

  // Define columns - INCLUDING the actions column
  const columns: Column<User>[] = [
    createColumn.text<User>('name')
      .header('Name')
      .build(),

    createColumn.text<User>('email')
      .header('Email')
      .build(),

    createColumn.status<User>('status')
      .header('Status')
      .build(),

    // Actions column - now integrated into the regular column system
    createColumn.actions<User>()
      .header('Actions')
      .width('100px')
      .build(),
  ]

  // Define actions using the builder
  const tableActions = Actions.create<User>()
    .edit((user) => handleEdit(user))
    .copy((user) => user.id.toString(), 'Copy ID')
    .separator()
    .delete((user) => handleDelete(user))
    .build()

  const handleEdit = (user: User) => {
    console.log('Edit user:', user)
    // Handle edit action
  }

  const handleDelete = (user: User) => {
    console.log('Delete user:', user)
    // Handle delete action - remove from data
    setData(prev => prev.filter(u => u.id !== user.id))
  }

  const handleRowAction = (action: string, row: User) => {
    const actionConfig = tableActions.find(a => a.value === action)
    if (actionConfig?.onClick) {
      actionConfig.onClick(row)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <DataTable
        data={data}
        columns={columns}
        title="Actions Column Integration Example"
        onRowAction={handleRowAction}
        actions={tableActions}
        // Note: showActions is still supported for backward compatibility
        // but when you include an actions column, it takes precedence
      />
    </div>
  )
}

/*
 * Key Benefits of the New Actions Column Approach:
 * 
 * 1. **Consistent Column Handling**: Actions columns are now treated like
 *    any other column in terms of rendering, styling, and positioning.
 * 
 * 2. **Better Flexibility**: You can position actions columns anywhere in
 *    your column list (not just at the end).
 * 
 * 3. **Proper CSS Classes**: Actions columns get the correct 'dt-v2-col-actions'
 *    and 'dt-v2-cell-actions' classes for styling.
 * 
 * 4. **Width Control**: You can set custom widths on actions columns just
 *    like any other column.
 * 
 * 5. **Backward Compatibility**: The old showActions approach still works
 *    when no actions column is present in the column definitions.
 * 
 * 6. **Clean Integration**: Actions dropdown is rendered directly in the
 *    cell renderer via getCellValue().
 */
