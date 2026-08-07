"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import "@/styles/database-view/branches.css"
import { EditUserDialog } from "@/components/database-view/EditUserDialog"
import { AddUserDialog } from "@/components/database-view/AddUserDialog"
import { EditBranchDialog, BranchRow } from "@/components/database-view/EditBranchDialog"
import { AddBranchDialog } from "@/components/database-view/AddBranchDialog"
import { getBranches } from "@/utils/api/getBranches"
import { getUsers, User as APIUser } from "@/utils/api/getUser"
import { addUser } from "@/utils/api/addUser"
import { toast} from "sonner"
import { Search, Plus, ChevronRight } from "lucide-react"

// Updated Branch type with all fields
type Branch = {
  branch_id: string
  branch_name: string
  location: string
  branch_code?: string
  branch_number?: number
  type?: string
  fb_link?: string | null
}

type User = {
  id: string
  branchId: string
  userName?: string | null
  position?: string | null
}

export default function Branches() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [addBranchOpen, setAddBranchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [userSearchQuery, setUserSearchQuery] = useState("")

  useEffect(() => {
    async function fetchBranches() {
      const token = sessionStorage.getItem("token")
      if (!token) return

      try {
        const data = await getBranches()
        setBranches(data)
        // Auto-select first branch if none selected
        if (data.length > 0 && !selectedBranchId) {
          setSelectedBranchId(data[0].branch_id)
        }
      } catch (err) {
        console.error("Error fetching branches:", err)
      }
    }
    fetchBranches()
  }, [])

  useEffect(() => {
    async function fetchUsers() {
      try {
        const data: APIUser[] = await getUsers()
        const mappedUsers: User[] = data.map(u => ({
          id: u.user_id,
          branchId: u.branch_id,
          userName: u.user_name ?? null,
          position: u.position ?? null,
        }))
        setUsers(mappedUsers)
      } catch (err) {
        console.error("Failed to fetch users:", err)
      }
    }

    fetchUsers()
  }, [])

  const selectedBranch = branches.find((b) => b.branch_id === selectedBranchId)
  const filteredUsers = users.filter((u) => u.branchId === selectedBranchId)

  // Filter users based on search query
  const searchedUsers = filteredUsers.filter((user) =>
    user.id.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    (user.userName && user.userName.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
    (user.position && user.position.toLowerCase().includes(userSearchQuery.toLowerCase()))
  )

  // Filter branches based on search query
  const filteredBranches = branches.filter((branch) =>
    branch.branch_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.branch_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatPosition = (pos?: string | null) => {
    if (!pos) return "—"
    const lower = pos.toLowerCase()
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  }

  const formatUserName = (name?: string | null) => {
    if (!name) return "—"
    const trimmed = name.trim()
    return trimmed.length > 0 ? trimmed : "—"
  }

  const getPositionBadgeClass = (position?: string | null) => {
    if (!position) return 'position-badge-default'
    const lower = position.toLowerCase()
    if (lower === 'superadmin') return 'position-badge-superadmin'
    if (lower === 'manager') return 'position-badge-manager'
    if (lower === 'staff') return 'position-badge-staff'
    return 'position-badge-default'
  }

  // Validate branch ID format
  const validateBranchId = (id: string) => {
    const pattern = /^[A-Za-z0-9]{5}-[BW]-[A-Za-z0-9]{3}$/
    return pattern.test(id)
  }

  // Add User handler
  const handleAddUser = async (
    userId: string,
    branchId: string,
    password?: string,
    position: string = "staff",
    userName?: string | null
  ) => {
    try {
      const newUser = await addUser({ userId, branchId, password: password!, position, userName: userName ?? null })

      const mappedUser: User = {
        id: newUser.user.user_id,
        branchId: newUser.user.branch_id,
        userName: newUser.user.user_name ?? null,
        position: newUser.user.position ?? position,
      }

      setUsers((prev) => [...prev, mappedUser])
      toast.success("User added successfully")
    } catch (err) {
      console.error("Failed to add user:", err)
      if (err instanceof Error) {
        toast.error(`Could not add user: ${err.message}`)
      } else {
        toast.error("Could not add user: Unknown error")
      }
    }
  }

  // Delete User handler
  const handleUserDeleted = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId))
  }

  // Edit User handler
  const handleUserEdited = (updatedUser: User) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === updatedUser.id
          ? {
              ...u,
              branchId: updatedUser.branchId,
              userName: updatedUser.userName ?? u.userName,
              position: updatedUser.position ?? u.position,
            }
          : u
      )
    )
  }

  // Add Branch handler
  const handleBranchAdded = (newBranch: Branch) => {
    setBranches((prev) => [...prev, newBranch])
    setSelectedBranchId(newBranch.branch_id)
  }

  // Edit Branch handler
  const handleEditBranch = (updatedBranch: BranchRow) => {
    // Check if it's the super admin branch
    if (updatedBranch.branchId === "SWAS-SUPERADMIN") {
      toast.error("SWAS-SUPERADMIN branch cannot be modified")
      return
    }

    // Validate format
    if (!validateBranchId(updatedBranch.branchId)) {
      toast.error("Branch ID format is invalid")
      return
    }

    setBranches((prev) =>
      prev.map((b) =>
        b.branch_id === updatedBranch.branchId 
          ? {
              branch_id: updatedBranch.branchId,
              branch_name: updatedBranch.branchName,
              location: updatedBranch.location,
              branch_code: updatedBranch.branchCode || b.branch_code,
              type: updatedBranch.type || b.type,
              fb_link: updatedBranch.fbLink !== undefined ? updatedBranch.fbLink : b.fb_link,
            }
          : b
      )
    )
  }

  // Delete Branch handler
  const handleBranchDeleted = (branchId: string) => {
    // Check if it's the super admin branch
    if (branchId === "SWAS-SUPERADMIN") {
      toast.error("SWAS-SUPERADMIN branch cannot be deleted")
      return
    }

    setBranches((prev) => prev.filter((b) => b.branch_id !== branchId))
    if (selectedBranchId === branchId) {
      setSelectedBranchId(branches.length > 1 ? branches[0].branch_id : null)
    }
  }

  const getUserCount = (branchId: string) => {
    return users.filter((u) => u.branchId === branchId).length
  }

  return (
    <div className="branches-wrapper">
      {/* Branches - 1/3 width */}
      <Card className="branches-cards branches-list-card">
        <CardHeader className="branches-card-header flex flex-row justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <i className="bi bi-shop-window header-icon"></i>
            <h1 className="text-xl font-bold">Branches</h1>
          </CardTitle>
          <Button 
            className="add-branch-btn extra-bold"
            onClick={() => setAddBranchOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Branch
          </Button>
        </CardHeader>

        <CardContent className="branches-card-content">
          {/* Search Bar */}
          <div className="search-container mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search branches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Branch Cards */}
          <div className="branches-list">
            {filteredBranches.map((branch) => {
              const isSelected = selectedBranchId === branch.branch_id
              const userCount = getUserCount(branch.branch_id)
              const isSystemBranch = branch.branch_id === "SWAS-SUPERADMIN"
              
              return (
                <div
                  key={branch.branch_id}
                  className={`branch-card ${isSelected ? 'branch-card-selected' : ''}`}
                  onClick={() => setSelectedBranchId(branch.branch_id)}
                >
                  <div className="branch-card-content">
                    <div className="branch-card-header">
                      <div className="branch-name-wrapper">
                        <h3 className={`branch-name ${isSystemBranch ? 'branch-name-system' : ''}`}>
                          {branch.branch_name}
                        </h3>
                      </div>
                    </div>
                    
                    <div className="branch-details">
                      <div className="branch-location">
                        <span className="dot-separator"></span>
                        <span>{branch.location}</span>
                      </div>
                      <div className="branch-users">
                        <span className="dot-separator"></span>
                        <span>{userCount} {userCount === 1 ? 'User' : 'Users'}</span>
                      </div>
                      <div className="branch-id">
                        <span className="dot-separator"></span>
                        <span className="branch-id-label">ID:</span>
                        <span className="branch-id-value">{branch.branch_id}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="branch-card-actions">
                    <button
                      className={`edit-branch-btn ${isSelected ? 'edit-branch-btn-selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingBranch(branch)
                      }}
                    >
                      <i className="bi bi-pencil-square"></i>
                    </button>
                    <ChevronRight className="chevron-icon" />
                  </div>
                </div>
              )
            })}
            
            {filteredBranches.length === 0 && (
              <div className="no-branches">
                <p className="text-gray-500 text-sm">No branches found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Users in Selected Branch - 2/3 width */}
      <Card className="branches-cards users-list-card">
        <CardHeader className="branches-card-header flex flex-row justify-between items-center">
          <div className="flex items-center gap-2">
            <i className="bi bi-people header-icon"></i>
            <h1 className="text-xl font-bold">
              {selectedBranch ? selectedBranch.branch_name : "Select a Branch"}
            </h1>
          </div>
          <div className="flex items-center gap-3 !mt-1">
            {selectedBranch && (
              <div className="search-container user-search">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search users..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>
            )}
            {selectedBranch && selectedBranch.branch_id !== "SWAS-SUPERADMIN" && (
              <Button className="add-user-btn extra-bold" onClick={() => setAddUserOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add User
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="branches-card-content">
          {selectedBranch ? (
            searchedUsers.length > 0 ? (
              <div className="users-table-container">
                <table className="users-table">
                  <thead className="users-table-header">
                    <tr>
                      <th className="users-col-id">User ID</th>
                      <th className="users-col-name">Username</th>
                      <th className="users-col-position">Position</th>
                      <th className="users-col-action">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchedUsers.map((user) => (
                      <tr key={user.id} className="users-row">
                        <td className="users-col-id bold">{user.id}</td>
                        <td className="users-col-name">{formatUserName(user.userName)}</td>
                        <td className="users-col-position">
                          <span className={`extra-bold position-badge ${getPositionBadgeClass(user.position)}`}>
                            {formatPosition(user.position)}
                          </span>
                        </td>
                        <td className="users-col-action">
                          <button
                            className="edit-user-btn"
                            onClick={() => setEditingUser(user)}
                          >
                            <i className="bi bi-pencil-square"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-users">
                <p className="text-sm text-gray-500">No users found</p>
              </div>
            )
          ) : (
            <div className="no-selection">
              <p className="text-sm text-gray-500">Please select a branch to view its users.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {editingUser && (
        <EditUserDialog
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          user={{
            userId: editingUser.id,
            branchId: editingUser.branchId,
            userName: editingUser.userName ?? null,
            position: editingUser.position ?? null,
          }}
          branchIds={branches.map((b) => b.branch_id)}
          onUserDeleted={handleUserDeleted}
          onUserEdited={(updatedUserRow) => {
            handleUserEdited({
              id: updatedUserRow.userId,
              branchId: updatedUserRow.branchId,
              userName: updatedUserRow.userName ?? null,
              position: updatedUserRow.position,
            })
          }}
        />
      )}

      {selectedBranch && (
        <AddUserDialog
          open={addUserOpen}
          onOpenChange={setAddUserOpen}
          branchIds={branches.map((b) => b.branch_id)}
          onAddUser={handleAddUser}
          defaultBranchId={selectedBranchId}
        />
      )}

      {editingBranch && (
        <EditBranchDialog
          open={!!editingBranch}
          onOpenChange={(open) => !open && setEditingBranch(null)}
          branch={{
            branchId: editingBranch.branch_id,
            branchName: editingBranch.branch_name,
            location: editingBranch.location,
            branchCode: editingBranch.branch_code,
            type: editingBranch.type,
            fbLink: editingBranch.fb_link,
          }}
          onBranchDeleted={handleBranchDeleted}
          onBranchEdited={handleEditBranch}
        />
      )}

      <AddBranchDialog
        open={addBranchOpen}
        onOpenChange={setAddBranchOpen}
        onBranchAdded={handleBranchAdded}
      />
    </div>
  )
}