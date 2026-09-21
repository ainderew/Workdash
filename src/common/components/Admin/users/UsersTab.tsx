import React, { useMemo, useState } from "react";
import { useAdminResource } from "../useAdminApi";
import type {
  AdminUserFilters,
  AdminUserListResponse,
  AdminUserSummary,
} from "../_types";
import { UserFilterBar } from "./UserFilterBar";
import { UserTable } from "./UserTable";
import { UserPagination } from "./UserPagination";
import { UserDetailDrawer } from "./UserDetailDrawer";
import { useDebouncedValue } from "../useDebouncedValue";

const INITIAL_FILTERS: AdminUserFilters = {
  search: "",
  role: "",
  status: "",
  page: 1,
  sort: "createdAt",
  direction: "desc",
};

export function UsersTab({ jwt }: { jwt: string }) {
  const [filters, setFilters] = useState<AdminUserFilters>(INITIAL_FILTERS);
  const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(
    null,
  );
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const path = useMemo(
    () => buildUsersPath({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );

  const { data, error, isLoading } = useAdminResource<AdminUserListResponse>(
    path,
    jwt,
  );

  /** Any filter change resets to page 1 — page 7 of a new filter is a dead end. */
  const updateFilters = (patch: Partial<AdminUserFilters>) =>
    setFilters((current) => ({
      ...current,
      ...patch,
      page: "page" in patch ? (patch.page ?? 1) : 1,
    }));

  return (
    <div className="space-y-4">
      <UserFilterBar
        filters={filters}
        total={data?.pagination.total ?? null}
        onChange={updateFilters}
      />

      {error ? (
        <div className="wd-card p-6 text-sm" role="alert">
          <span className="wd-text-primary font-medium">
            Could not load users.
          </span>{" "}
          <span className="wd-text-muted">{error.message}</span>
        </div>
      ) : (
        <>
          <UserTable
            users={data?.users ?? []}
            sort={filters.sort}
            direction={filters.direction}
            isLoading={isLoading}
            onSort={(sort, direction) => updateFilters({ sort, direction })}
            onSelect={setSelectedUser}
          />
          {data && data.pagination.totalPages > 1 && (
            <UserPagination
              pagination={data.pagination}
              onPageChange={(page) => updateFilters({ page })}
            />
          )}
        </>
      )}

      {selectedUser && (
        <UserDetailDrawer
          jwt={jwt}
          userId={selectedUser.id}
          fallbackName={selectedUser.email}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}

function buildUsersPath(filters: AdminUserFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    sort: filters.sort,
    direction: filters.direction,
  });

  const search = filters.search.trim();
  if (search) params.set("search", search);
  if (filters.role) params.set("role", filters.role);
  if (filters.status) params.set("status", filters.status);

  return `/users?${params.toString()}`;
}
