"use client";
// Owner: P1
// Admin page: all users. "Make admin" / "Make reader" calls the procedure
// sp_change_user_role. The new role applies from that user's next login.
import { useEffect, useState } from "react";
import { changeUserRole, getSession, getUsers } from "@/lib/api";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [me, setMe] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      setUsers((await getUsers()).users);
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { setMe(getSession()); load(); }, []);

  async function change(user, role) {
    setError("");
    setMessage("");
    try {
      await changeUserRole(user.email, role);
      setMessage(`${user.name} is now ${role} (from their next login)`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main>
      <p className="kicker">Admin</p>
      <h1>Users</h1>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Comments</th><th>Saved</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user_id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.comments}</td>
                <td>{user.bookmarks}</td>
                <td>
                  {user.user_id === me?.user_id ? <span className="muted">you</span>
                    : user.role === "reader"
                      ? <button className="link" onClick={() => change(user, "admin")}>Make admin</button>
                      : <button className="link" onClick={() => change(user, "reader")}>Make reader</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
