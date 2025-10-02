"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import "@/styles/database-view/branches.css"
import { EditUserDialog } from "@/components/database-view/EditUserDialog"
import { AddUserDialog } from "@/components/database-view/AddUserDialog"
import { getBranches } from "@/utils/api/getBranches"
import { getUsers, User as APIUser } from "@/utils/api/getUser"
import { addUser } from "@/utils/api/addUser"
import { toast, Toaster } from "sonner"

type Branch = {
  branch_id: string
  branch_name: string
  location: string
}

type User = {
  id: string
  branchId: string
}

export default function Branches() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [addUserOpen, setAddUserOpen] = useState(false)

  useEffect(() => {
    async function fetchBranches() {
      const token = sessionStorage.getItem("token")
      if (!token) return

      try {
        const data = await getBranches()
        setBranches(data)
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

  // Add User handler
  const handleAddUser = async (userId: string, branchId: string, password?: string) => {
    try {
      const newUser = await addUser({ userId, branchId, password: password! })

      const mappedUser: User = {
        id: newUser.user.user_id,
        branchId: newUser.user.branch_id,
      }

      setUsers((prev) => [...prev, mappedUser])
      toast.success("User added successfully") // Success toast
    } catch (err) {
      console.error("Failed to add user:", err)
      if (err instanceof Error) {
        toast.error(`Could not add user: ${err.message}`) // Error toast
      } else {
        toast.error("Could not add user: Unknown error") // Error toast
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
        u.id === updatedUser.id ? { ...u, branchId: updatedUser.branchId } : u
      )
    )
  }

  return (
    <div className="branches-wrapper">
      {/* Branches Table */}
      <Card className="branches-cards">
        <CardHeader className="flex flex-row justify-between pb-0">
          <CardTitle>
            <h1 className="mt-3">Branches</h1>
          </CardTitle>
        </CardHeader>

        <CardContent className="branch-card-contents">
          <div className="branches-table-container">
            <Table className="branches-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="branches-col-id text-center text-black">
                    <h5>Branch ID</h5>
                  </TableHead>
                  <TableHead className="branches-col-name text-center text-black">
                    <h5>Branch</h5>
                  </TableHead>
                  <TableHead className="branches-col-location text-center text-black">
                    <h5>Location</h5>
                  </TableHead>
                  <TableHead className="branches-col-action text-black">
                    <h5>Action</h5>
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {branches.map((branch) => (
                  <TableRow key={branch.branch_id} className="branches-row">
                    <TableCell className="branches-col-id text-center">
                      <small className="bold">{branch.branch_id}</small>
                    </TableCell>
                    <TableCell className="branches-col-name">
                      <small>{branch.branch_name}</small>
                    </TableCell>
                    <TableCell className="branches-col-location">
                      <small>{branch.location}</small>
                    </TableCell>
                    <TableCell className="branches-col-action">
                      <Button
                        className={`branches-btn extra-bold ${
                          selectedBranchId === branch.branch_id ? "branches-btn-active" : ""
                        }`}
                        variant={selectedBranchId === branch.branch_id ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setSelectedBranchId(selectedBranchId === branch.branch_id ? null : branch.branch_id)
                        }
                      >
                        View Users
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Users in Selected Branch */}
      <Card className="branches-cards">
        <CardHeader className="flex flex-row justify-between pb-0">
          <CardTitle>
            <h1 className="mt-3">
              {selectedBranch ? `Users in ${selectedBranch.branch_name}` : "Select a Branch"}
            </h1>
          </CardTitle>
          {selectedBranch && (
            <Button className="extra-bold" onClick={() => setAddUserOpen(true)}>
              Add User
            </Button>
          )}
        </CardHeader>

        <CardContent className="branch-card-contents">
          {selectedBranch ? (
            filteredUsers.length > 0 ? (
              <div className="branches-table-container">
                <Table className="branches-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="users-col-id text-center text-black">
                        <h5>User ID</h5>
                      </TableHead>
                      <TableHead className="users-col-branch text-center text-black">
                        <h5>Branch ID</h5>
                      </TableHead>
                      <TableHead className="users-col-action text-black">
                        <h5>Action</h5>
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} className="branches-row">
                        <TableCell className="users-col-id">
                          <small>{user.id}</small>
                        </TableCell>
                        <TableCell className="users-col-branch text-center">
                          <small>{user.branchId}</small>
                        </TableCell>
                        <TableCell className="users-col-action">
                          <Button
                            className="bg-[#CE1616] hover:bg-[#E64040] text-white extra-bold"
                            size="sm"
                            onClick={() => setEditingUser(user)}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No users available for this branch.</p>
            )
          ) : (
            <p className="text-sm text-gray-500">Please select a branch to view its users.</p>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {editingUser && (
        <EditUserDialog
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          user={{
            userId: editingUser.id, // map id -> userId
            branchId: editingUser.branchId,
          }}
          branchIds={branches.map((b) => b.branch_id)}
          onUserDeleted={handleUserDeleted}
          onUserEdited={(updatedUserRow) => {
            // map back to User type for state
            handleUserEdited({
              id: updatedUserRow.userId,
              branchId: updatedUserRow.branchId,
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

      <Toaster position="top-center" richColors />
    </div>
  )
}
