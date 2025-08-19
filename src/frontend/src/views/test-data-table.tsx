import { useState } from 'react'
import { DataTable, createColumn, Actions } from '@/components/features/data-table'
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
  },
  {
    id: 6,
    name: "Fiona Green",
    email: "fiona@example.com",
    role: "Admin",
    status: "Active",
    department: "IT",
    location: "Boston",
    phone: "111-222-3333",
    hired: "2021-03-15",
    lastLogin: "2023-12-08",
  },
  {
    id: 7,
    name: "George Wilson",
    email: "george@example.com",
    role: "Manager",
    status: "Active",
    department: "Sales",
    location: "Miami",
    phone: "222-333-4444",
    hired: "2020-05-20",
    lastLogin: "2023-12-09",
  },
  {
    id: 8,
    name: "Hannah Davis",
    email: "hannah@example.com",
    role: "Developer",
    status: "Active",
    department: "Engineering",
    location: "Portland",
    phone: "333-444-5555",
    hired: "2022-08-10",
    lastLogin: "2023-12-10",
  },
  {
    id: 9,
    name: "Ian Thompson",
    email: "ian@example.com",
    role: "User",
    status: "Inactive",
    department: "Support",
    location: "Denver",
    phone: "444-555-6666",
    hired: "2023-01-15",
    lastLogin: "2023-12-11",
  },
  {
    id: 10,
    name: "Julia Martinez",
    email: "julia@example.com",
    role: "Editor",
    status: "Active",
    department: "Content",
    location: "Phoenix",
    phone: "555-666-7777",
    hired: "2021-09-30",
    lastLogin: "2023-12-12",
  },
  {
    id: 11,
    name: "Kevin Lee",
    email: "kevin@example.com",
    role: "Developer",
    status: "Active",
    department: "Engineering",
    location: "San Diego",
    phone: "666-777-8888",
    hired: "2022-02-14",
    lastLogin: "2023-12-13",
  },
  {
    id: 12,
    name: "Laura Clark",
    email: "laura@example.com",
    role: "Manager",
    status: "Active",
    department: "HR",
    location: "Atlanta",
    phone: "777-888-9999",
    hired: "2020-11-05",
    lastLogin: "2023-12-14",
  }
]

export function TestDataTable() {
  const [searchValue, setSearchValue] = useState('')
  const [selectedRows, setSelectedRows] = useState<User[]>([])
  const [roleFilter, setRoleFilter] = useState('all')
  
  // Pagination state
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)

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

    // Test alignment - centered role
    createColumn.text<User>('role')
      .header('Role (Centered)')
      .withClass('font-medium')
      .align('center') // This should now work for both header and content
      .width('140px')
      .build(),

    // Actions column - integrated into regular column system
    createColumn.actions<User>()
      .header('Actions')
      .align('center') // Center the actions dropdown
      .width('100px') // Custom width for actions
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
  
  // Paginate data
  const startIndex = pageIndex * pageSize
  const endIndex = startIndex + pageSize
  const paginatedData = filteredData.slice(startIndex, endIndex)

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
    <DataTable
        data={paginatedData}
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
        pagination={{
          pageIndex,
          pageSize,
          totalItems: filteredData.length,
          onPageChange: setPageIndex,
          onPageSizeChange: setPageSize,
          showPagination: true,
          pageSizeOptions: [5, 10, 20, 50]
        }}
      />
  )
}

export default function TestDataTableWithDebug() {
  return (
    <div className="container mx-auto py-8">
      <TestDataTable />
    </div>
  )
}
