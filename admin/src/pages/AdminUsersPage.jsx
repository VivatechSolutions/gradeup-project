import { useEffect, useMemo, useState } from "react";
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUser,
} from "../api/client";
import { useAuth } from "../contexts/AuthContext";

const initialForm = {
  name: "",
  email: "",
  password: "",
  role: "admin",
  isActive: true,
};

function UserModal({
  open,
  mode,
  form,
  isSubmitting,
  error,
  onChange,
  onClose,
  onSubmit,
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="modal-layer" role="dialog" aria-modal="true">
      <button
        className="modal-backdrop"
        type="button"
        aria-label="Close modal"
        onClick={onClose}
      />
      <div className="modal-card">
        <div className="modal-head">
          <div>
            <p className="eyebrow">{mode === "edit" ? "Edit User" : "Create User"}</p>
            <h3>{mode === "edit" ? "Update admin account" : "Create a new admin account"}</h3>
            <p className="muted">
              {mode === "edit"
                ? "Update account details. Leave the password blank to keep the current password."
                : "A welcome email will be sent and the user will reset their password on first login."}
            </p>
          </div>
          <button className="ghost-btn" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>

        <form className="modal-form" onSubmit={onSubmit}>
          <label>
            Name
            <input
              type="text"
              value={form.name}
              onChange={(event) => onChange("name", event.target.value)}
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => onChange("email", event.target.value)}
              placeholder="name@gradeup.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="text"
              value={form.password}
              onChange={(event) => onChange("password", event.target.value)}
              placeholder={mode === "edit" ? "Leave blank to keep current password" : "Temporary password"}
            />
          </label>

          <label>
            Role
            <select
              value={form.role}
              onChange={(event) => onChange("role", event.target.value)}
            >
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </label>

          <label className="modal-toggle-row">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => onChange("isActive", event.target.checked)}
            />
            <span>Account is active</span>
          </label>

          {error ? <div className="error-banner">{error}</div> : null}

          <div className="modal-actions">
            <button className="ghost-btn" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? mode === "edit"
                  ? "Saving..."
                  : "Creating..."
                : mode === "edit"
                  ? "Save changes"
                  : "Create user"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const { admin } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (admin?.role === "super_admin") {
      loadAdmins();
    } else {
      setIsLoading(false);
    }
  }, [admin?.role]);

  async function loadAdmins() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetchAdminUsers();
      setAdmins(response.data || []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load admin users");
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId("");
    setModalError("");
  }

  function openCreateModal() {
    resetForm();
    setIsModalOpen(true);
  }

  function openEditModal(selectedAdmin) {
    setEditingId(selectedAdmin.id);
    setForm({
      name: selectedAdmin.name || "",
      email: selectedAdmin.email || "",
      password: "",
      role: selectedAdmin.role || "admin",
      isActive: Boolean(selectedAdmin.isActive),
    });
    setModalError("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    resetForm();
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setModalError("");

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        isActive: form.isActive,
      };

      if (form.password) {
        payload.password = form.password;
      }

      if (!editingId && !payload.password) {
        throw new Error("Password is required when creating a user");
      }

      if (editingId) {
        await updateAdminUser(editingId, payload);
        setMessage("Admin user updated successfully");
      } else {
        await createAdminUser(payload);
        setMessage("Admin user created successfully");
      }

      closeModal();
      await loadAdmins();
    } catch (submitError) {
      setModalError(submitError.message || "Failed to save admin user");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(userId) {
    const confirmed = window.confirm(
      "Delete this admin user? This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await deleteAdminUser(userId);
      setMessage("Admin user deleted successfully");
      await loadAdmins();
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete admin user");
    }
  }

  const filteredAdmins = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return admins;
    }

    return admins.filter((user) =>
      [user.name, user.email, user.role, user.isActive ? "active" : "inactive"]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [admins, search]);

  if (admin?.role !== "super_admin") {
    return (
      <section className="page">
        <div className="hero-card">
          <div>
            <p className="eyebrow">Admin Users</p>
            <h2>Super admin access only</h2>
            <p className="muted">
              Only super admins can view or manage admin accounts.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="hero-card split">
        <div>
          <p className="eyebrow">Admin Users</p>
          <h2>Manage your admin team</h2>
          <p className="muted">
            Create accounts, control access, and keep your admin workspace organized.
          </p>
        </div>
        <div className="hero-metrics">
          <div className="metric-card">
            <span>Total</span>
            <strong>{admins.length}</strong>
          </div>
          <div className="metric-card">
            <span>Active</span>
            <strong>{admins.filter((item) => item.isActive).length}</strong>
          </div>
        </div>
      </div>

      <div className="content-card">
        <div className="content-toolbar">
          <div>
            <h3>Team directory</h3>
            <p className="muted small">
              Search, review roles, and manage access from a single view.
            </p>
          </div>
          <div className="toolbar-actions">
            <input
              className="search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search users"
            />
            <button className="primary-btn" type="button" onClick={openCreateModal}>
              Create User
            </button>
          </div>
        </div>

        {message ? <div className="success-banner">{message}</div> : null}
        {error ? <div className="error-banner">{error}</div> : null}

        <div className="table-wrap premium-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="table-empty">
                    Loading admin users...
                  </td>
                </tr>
              ) : filteredAdmins.length ? (
                filteredAdmins.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">
                          {(user.name || "A").slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <strong>{user.name}</strong>
                          <div className="muted small">
                            {user.role === "super_admin" ? "Workspace owner" : "Admin member"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className="role-badge subtle">
                        {user.role === "super_admin" ? "Super Admin" : "Admin"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge${user.isActive ? " active" : " inactive"}`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleString()
                        : "Never"}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="ghost-btn"
                          type="button"
                          onClick={() => openEditModal(user)}
                        >
                          Edit
                        </button>
                        <button
                          className="danger-btn"
                          type="button"
                          onClick={() => handleDelete(user.id)}
                          disabled={user.id === admin?.id}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="table-empty">
                    No users match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserModal
        open={isModalOpen}
        mode={editingId ? "edit" : "create"}
        form={form}
        isSubmitting={isSubmitting}
        error={modalError}
        onChange={updateField}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </section>
  );
}
