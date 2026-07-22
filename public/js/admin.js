(() => {
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname;
  const isAuthPage =
    path.endsWith("/login.html") || path.endsWith("/signup.html");
  const isProtectedAdmin =
    path.includes("/admin/") &&
    !isAuthPage &&
    (path.endsWith(".html") || path.endsWith("/admin/") || path.endsWith("/admin"));

  const setText = (id, value) => {
    const el = document.querySelector(id);
    if (el) el.textContent = value ?? "—";
  };

  const apiFetch = (url, options = {}) =>
    fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });

  const readError = async (response) => {
    try {
      const result = await response.json();
      if (Array.isArray(result.message)) return result.message.join(" ");
      return result.message || "Request failed.";
    } catch {
      return "Request failed.";
    }
  };

  const redirectToLogin = () => {
    window.location.replace("/admin/login.html");
  };

  const requireAuth = async () => {
    if (!isProtectedAdmin) return true;
    try {
      const response = await apiFetch("/api/auth/me");
      if (!response.ok) {
        redirectToLogin();
        return false;
      }
      return true;
    } catch {
      redirectToLogin();
      return false;
    }
  };

  const bindSidebar = () => {
    const sidebar = document.querySelector("#admin-sidebar");
    const backdrop = document.querySelector("#admin-sidebar-backdrop");
    const openBtn = document.querySelector("#admin-menu-toggle");
    const closeBtn = document.querySelector("#admin-sidebar-close");
    if (!sidebar || !openBtn) return;

    const setOpen = (open) => {
      document.body.classList.toggle("sidebar-open", open);
      openBtn.setAttribute("aria-expanded", open ? "true" : "false");
      if (backdrop) backdrop.hidden = !open;
      document.body.style.overflow = open ? "hidden" : "";
    };

    openBtn.addEventListener("click", () => setOpen(true));
    closeBtn?.addEventListener("click", () => setOpen(false));
    backdrop?.addEventListener("click", () => setOpen(false));
    sidebar.querySelectorAll("nav a").forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });
  };

  const bindLogout = () => {
    const btn = document.querySelector("#admin-logout");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      try {
        await apiFetch("/api/auth/logout", { method: "POST" });
      } catch {
        /* ignore */
      }
      redirectToLogin();
    });
  };

  const bindLogin = () => {
    const form = document.querySelector("#login-form");
    if (!form) return;
    const status = document.querySelector("#form-status");

    apiFetch("/api/auth/me")
      .then((res) => {
        if (res.ok) window.location.replace("/admin/index.html");
      })
      .catch(() => {});

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (status) {
        status.className = "form-status";
        status.textContent = "Signing in…";
      }
      const data = new FormData(form);
      try {
        const response = await apiFetch("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: String(data.get("email") || "").trim(),
            password: String(data.get("password") || ""),
          }),
        });
        if (!response.ok) throw new Error(await readError(response));
        window.location.href = "/admin/index.html";
      } catch (error) {
        if (status) {
          status.className = "form-status is-error";
          status.textContent =
            error instanceof Error ? error.message : "Sign in failed.";
        }
      }
    });
  };

  const bindSignup = () => {
    const form = document.querySelector("#signup-form");
    if (!form) return;
    const status = document.querySelector("#form-status");
    const inviteField = document.querySelector("#invite-field");
    const inviteInput = form.elements.namedItem("inviteCode");

    apiFetch("/api/auth/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.inviteRequired && inviteField) {
          inviteField.classList.remove("is-hidden");
          if (inviteInput && "required" in inviteInput) {
            inviteInput.required = true;
          }
        }
      })
      .catch(() => {});

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (status) {
        status.className = "form-status";
        status.textContent = "Creating account…";
      }
      const data = new FormData(form);
      const payload = {
        name: String(data.get("name") || "").trim(),
        email: String(data.get("email") || "").trim(),
        password: String(data.get("password") || ""),
      };
      const invite = String(data.get("inviteCode") || "").trim();
      if (invite) payload.inviteCode = invite;

      try {
        const response = await apiFetch("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(await readError(response));
        window.location.href = "/admin/index.html";
      } catch (error) {
        if (status) {
          status.className = "form-status is-error";
          status.textContent =
            error instanceof Error ? error.message : "Signup failed.";
        }
      }
    });
  };

  const toDateInput = (value) => {
    if (!value) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toISOString().slice(0, 10);
  };

  const formToPayload = (form) => {
    const data = new FormData(form);
    const payload = {};
    data.forEach((value, key) => {
      if (key === "id") return;
      payload[key] = String(value).trim();
    });
    if (!payload.trackingCode) delete payload.trackingCode;
    if (!payload.shipmentHistory) payload.shipmentHistory = "";
    return payload;
  };

  const bindShipmentForm = async () => {
    const form = document.querySelector("#shipment-form");
    if (!form) return;
    const status = document.querySelector("#form-status");
    const isEdit = form.dataset.mode === "edit" || path.includes("edit.html");
    const id = params.get("id");

    if (isEdit) {
      if (!id) {
        if (status) {
          status.className = "form-status is-error";
          status.textContent = "Missing shipment id.";
        }
        return;
      }

      try {
        const response = await apiFetch(
          `/api/shipments/${encodeURIComponent(id)}`,
        );
        if (!response.ok) throw new Error(await readError(response));
        const shipment = await response.json();

        document.querySelector("#shipment-id").value = shipment.id;
        setText("#edit-subtitle", `Editing ${shipment.trackingCode}`);

        Object.entries(shipment).forEach(([key, value]) => {
          const field = form.elements.namedItem(key);
          if (!field || field instanceof RadioNodeList) return;
          if (key === "dateOfDeparture" || key === "estimatedDateOfArrival") {
            field.value = toDateInput(String(value));
          } else if ("value" in field) {
            field.value = value == null ? "" : String(value);
          }
        });
      } catch (error) {
        if (status) {
          status.className = "form-status is-error";
          status.textContent =
            error instanceof Error ? error.message : "Unable to load shipment.";
        }
      }
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (status) {
        status.className = "form-status";
        status.textContent = "Saving…";
      }

      const payload = formToPayload(form);
      const shipmentId = document.querySelector("#shipment-id")?.value;
      const url =
        isEdit && shipmentId
          ? `/api/shipments/${encodeURIComponent(shipmentId)}`
          : "/api/shipments";
      const method = isEdit && shipmentId ? "PUT" : "POST";

      try {
        const response = await apiFetch(url, {
          method,
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) {
          const message = Array.isArray(result.message)
            ? result.message.join(" ")
            : result.message || "Unable to save shipment.";
          throw new Error(message);
        }

        if (status) {
          status.className = "form-status is-success";
          status.textContent = isEdit
            ? "Shipment updated."
            : `Shipment created. Tracking: ${result.shipment.trackingCode}`;
        }

        window.setTimeout(() => {
          window.location.href = "/admin/index.html";
        }, 700);
      } catch (error) {
        if (status) {
          status.className = "form-status is-error";
          status.textContent =
            error instanceof Error ? error.message : "Save failed.";
        }
      }
    });
  };

  const bindDashboard = async () => {
    const body = document.querySelector("#shipments-body");
    if (!body) return;

    const load = async () => {
      body.innerHTML = `<tr><td colspan="10">Loading shipments…</td></tr>`;
      try {
        const response = await apiFetch("/api/shipments");
        if (!response.ok) throw new Error(await readError(response));
        const shipments = await response.json();
        if (!Array.isArray(shipments) || shipments.length === 0) {
          body.innerHTML = `<tr><td colspan="10">No shipments yet. Create one.</td></tr>`;
          return;
        }

        body.innerHTML = shipments
          .map(
            (item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td><strong>${item.trackingCode}</strong></td>
              <td>${item.destination}</td>
              <td>${item.receiverEmail}</td>
              <td>${item.dateOfDeparture}</td>
              <td>${item.estimatedDateOfArrival}</td>
              <td><span class="badge">${item.statusLevel}</span></td>
              <td><a class="action-btn" href="/admin/edit.html?id=${encodeURIComponent(item.id)}">Edit</a></td>
              <td><a class="action-btn" href="/admin/receipt.html?id=${encodeURIComponent(item.id)}">Receipt</a></td>
              <td><button class="action-btn action-btn--danger" type="button" data-delete="${item.id}">Delete</button></td>
            </tr>`,
          )
          .join("");
      } catch {
        body.innerHTML = `<tr><td colspan="10">Failed to load shipments.</td></tr>`;
      }
    };

    body.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const id = target.getAttribute("data-delete");
      if (!id) return;
      if (!window.confirm("Delete this shipment?")) return;
      try {
        const response = await apiFetch(
          `/api/shipments/${encodeURIComponent(id)}`,
          { method: "DELETE" },
        );
        if (!response.ok) throw new Error("Delete failed");
        await load();
      } catch {
        window.alert("Unable to delete shipment.");
      }
    });

    await load();
  };

  const bindReceipt = async () => {
    const receipt = document.querySelector("#receipt");
    if (!receipt) return;
    const id = params.get("id");
    const printBtn = document.querySelector("#print-receipt");
    if (printBtn) {
      printBtn.addEventListener("click", () => window.print());
    }
    if (!id) return;

    try {
      const response = await apiFetch(
        `/api/shipments/${encodeURIComponent(id)}`,
      );
      if (!response.ok) throw new Error("Not found");
      const shipment = await response.json();

      setText("#r-code", shipment.trackingCode);
      setText("#r-sender-name", shipment.senderName);
      setText("#r-sender-address", shipment.senderAddress);
      setText("#r-sender-email", shipment.senderEmail);
      setText("#r-receiver-name", shipment.receiverName);
      setText("#r-receiver-address", shipment.receiverAddress);
      setText("#r-receiver-email", shipment.receiverEmail);
      setText("#r-parcel", shipment.parcelDetails);
      setText("#r-weight", shipment.weight);
      setText("#r-city", shipment.cityOfDeparture);
      setText("#r-depart", shipment.dateOfDeparture);
      setText("#r-eta", shipment.estimatedDateOfArrival);
      setText("#r-location", shipment.currentLocation);
      setText("#r-status", shipment.deliveryStatus);
      setText("#r-level", shipment.statusLevel);
      setText("#r-amount", shipment.amountPaid);
      setText("#r-destination", shipment.destination);
      setText("#r-history", shipment.shipmentHistory || "—");
    } catch {
      setText("#r-code", "Shipment not found");
    }
  };

  const boot = async () => {
    bindLogin();
    bindSignup();
    bindSidebar();
    bindLogout();

    const ok = await requireAuth();
    if (!ok) return;

    bindDashboard();
    bindShipmentForm();
    bindReceipt();
  };

  boot();
})();
