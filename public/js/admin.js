(() => {
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname;

  const setText = (id, value) => {
    const el = document.querySelector(id);
    if (el) el.textContent = value ?? "—";
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
        const shipment = await fetch(`/api/shipments/${encodeURIComponent(id)}`).then(
          (res) => {
            if (!res.ok) throw new Error("Shipment not found.");
            return res.json();
          },
        );

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
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
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
        const shipments = await fetch("/api/shipments").then((res) => res.json());
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
        const response = await fetch(`/api/shipments/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
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
      const shipment = await fetch(`/api/shipments/${encodeURIComponent(id)}`).then(
        (res) => {
          if (!res.ok) throw new Error("Not found");
          return res.json();
        },
      );

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

  bindDashboard();
  bindShipmentForm();
  bindReceipt();
})();
