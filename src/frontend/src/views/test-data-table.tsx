import { useState } from 'react'
import { DataTable, createColumn, Actions, DEFAULT_COLUMN_WIDTHS } from '@/components/features/data-table'
import type { Column, ColumnWidthConfig } from '@/components/features/data-table'

// Sample data interface
interface User {
  id: number
  name: string
  email: string
  role: string
  status: string
  department: string
  location: string
  phone: string
  hired: string
  lastLogin: string
}

// Sample data
const sampleData: User[] = [
  {
    id: 1,
    name: "Alice Johnson",
    email: "alice@example.com",
    role: "Admin",
    status: "Active",
    department: "HR",
    location: "New York",
    phone: "123-456-7890",
    hired: "2020-01-15",
    lastLogin: "2023-12-01",
  },
  {
    id: 2,
    name: "Bob Smith",
    email: "bob@example.com",
    role: "User",
    status: "Inactive",
    department: "Engineering",
    location: "San Francisco",
    phone: "987-654-3210",
    hired: "2021-06-20",
    lastLogin: "2023-11-28",
  },
  {
    id: 3,
    name: "Charlie Brown",
    email: "charlie@example.com",
    role: "Editor",
    status: "Active",
    department: "Design",
    location: "Austin",
    phone: "555-123-4567",
    hired: "2019-09-10",
    lastLogin: "2023-12-05",
  },
  {
    id: 4,
    name: "Diana Prince",
    email: "diana@example.com",
    role: "Manager",
    status: "Active",
    department: "Marketing",
    location: "Chicago",
    phone: "444-555-6666",
    hired: "2018-03-22",
    lastLogin: "2023-12-06",
  },
  {
    id: 5,
    name: "Edward Norton",
    email: "edward@example.com",
    role: "Developer",
    status: "Active",
    department: "Engineering",
    location: "Seattle",
    phone: "777-888-9999",
    hired: "2022-11-01",
    lastLogin: "2023-12-07",
  }
]

export function TestDataTable() {
  const [searchValue, setSearchValue] = useState('')
  const [selectedRows, setSelectedRows] = useState<User[]>([])
  const [roleFilter, setRoleFilter] = useState('all')

  // Define columns using declarative builders
  const columns: Column<User>[] = [
    // Pinned column - will stick to the left
    createColumn.text<User>('name')
      .header('Name')
      .pinned() // This makes it sticky!
      .width('300px') // Individual width override (larger than global pinned width)
      .build(),

    // Scrollable columns with various types and formatting
    createColumn.text<User>('email')
      .header('Email')
      .truncate(25)
      .width('220px') // Individual width override for email
      .build(),

    createColumn.text<User>('role')
      .header('Role')
      .withClass('font-medium')
      .width('120px') // Narrow for role
      .build(),

    createColumn.status<User>('status')
      .header('Status')
      .width('140px') // Custom width for status badges
      .build(),

    createColumn.text<User>('department')
      .header('Department')
      .build(), // Uses global scrollable width (180px)

    createColumn.text<User>('location')
      .header('Location')
      .width('160px') // Slightly narrower for location
      .build(),

    createColumn.text<User>('phone')
      .header('Phone')
      .width('150px') // Fixed width for phone numbers
      .minWidth('120px') // Also set a minimum width
      .build(),

    createColumn.date<User>('hired')
      .header('Hired Date')
      .width('130px') // Compact for dates
      .build(),

    createColumn.date<User>('lastLogin')
      .header('Last Login')
      .width('130px') // Same as hired date
      .build(),
  ]

  // Filter data based on search and role filter
  const filteredData = sampleData.filter(user => {
    const matchesSearch = searchValue === '' || 
      user.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      user.email.toLowerCase().includes(searchValue.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || user.role.toLowerCase() === roleFilter.toLowerCase()
    
    return matchesSearch && matchesRole
  })

  // Define actions using declarative builder
  const tableActions = Actions.create<User>()
    .view((user) => `/users/${user.id}`, 'View Profile')
    .edit((user) => handleEdit(user))
    .copy((user) => user.id.toString(), 'Copy ID')
    .separator()
    .delete((user) => handleDelete(user))
    .build()

  // Event handlers
  const handleRowAction = (action: string, row: User) => {
    const actionConfig = tableActions.find(a => a.value === action)
    if (actionConfig?.onClick) {
      actionConfig.onClick(row)
    }
  }

  const handleEdit = (user: User) => {
    alert(`Edit user: ${user.name}`)
  }

  const handleDelete = (user: User) => {
    if (confirm(`Delete user ${user.name}?`)) {
      alert(`User ${user.name} deleted!`)
    }
  }

  const handleAddNew = () => {
    alert('Add new user clicked!')
  }

  // Custom column widths - override defaults for better UX
  const customColumnWidths: ColumnWidthConfig = {
    checkbox: '2.5rem',    // Slightly wider than default (48px)
    pinned: '250px',     // Wider for names (default: 200px)
    scrollable: '180px', // Wider for better readability (default: 150px)
    actions: '100px',    // Wider for action dropdown (default: 80px)
  }

  return (
    <div className="container mx-auto py-8">
      <DataTable
        data={filteredData}
        columns={columns}
        title="User Management"
        searchPlaceholder="Search users..."
        searchValue={searchValue}
        onSearch={setSearchValue}
        selectedRows={selectedRows}
        onRowSelect={setSelectedRows}
        onRowAction={handleRowAction}
        showCheckboxes={true}
        showActions={true}
        onAddNew={handleAddNew}
        addNewLabel="Add User"
        filters={[
          {
            label: "Filter by role",
            key: "role",
            value: roleFilter,
            onChange: setRoleFilter,
            options: [
              { label: "All Roles", value: "all" },
              { label: "Admin", value: "admin" },
              { label: "Manager", value: "manager" },
              { label: "Developer", value: "developer" },
              { label: "Editor", value: "editor" },
              { label: "User", value: "user" }
            ]
          }
        ]}
        actions={tableActions}
        columnWidths={customColumnWidths}
      />

      {/* Debug info */}
      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Debug Info:</h3>
        <p>Search: "{searchValue}"</p>
        <p>Role Filter: {roleFilter}</p>
        <p>Filtered Results: {filteredData.length}</p>
        <p>Selected Rows: {selectedRows.length}</p>
        {selectedRows.length > 0 && (
          <p>Selected Users: {selectedRows.map(r => r.name).join(', ')}</p>
        )}
        
        <h4 className="font-semibold mt-4 mb-2">Column Width Configuration:</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-medium">Default Widths:</p>
            <ul className="mt-1 space-y-1">
              <li>• Checkbox: {DEFAULT_COLUMN_WIDTHS.checkbox}</li>
              <li>• Pinned: {DEFAULT_COLUMN_WIDTHS.pinned}</li>
              <li>• Scrollable: {DEFAULT_COLUMN_WIDTHS.scrollable}</li>
              <li>• Actions: {DEFAULT_COLUMN_WIDTHS.actions}</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">Global Custom:</p>
            <ul className="mt-1 space-y-1">
              <li>• Checkbox: {customColumnWidths.checkbox}</li>
              <li>• Pinned: {customColumnWidths.pinned}</li>
              <li>• Scrollable: {customColumnWidths.scrollable}</li>
              <li>• Actions: {customColumnWidths.actions}</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">Individual Overrides:</p>
            <ul className="mt-1 space-y-1">
              <li>• Name: 300px (pinned)</li>
              <li>• Email: 220px</li>
              <li>• Role: 120px</li>
              <li>• Status: 140px</li>
              <li>• Department: uses global</li>
              <li>• Location: 160px</li>
              <li>• Phone: 150px + min 120px</li>
              <li>• Dates: 130px each</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
