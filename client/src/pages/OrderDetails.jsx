import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, FileText, Truck } from "lucide-react";
import api from "../utils/axios";
import { toast } from "sonner";

const OrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [orderResponse, timelineResponse] = await Promise.all([
          api.get(`/api/orders/${orderId}`),
          api.get(`/api/orders/${orderId}/timeline`),
        ]);
        setOrder(orderResponse.data);
        setTimeline(timelineResponse.data?.timeline || []);
      } catch (error) {
        console.error(error);
        toast.error("Could not load the order details");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [orderId]);

  const downloadInvoice = async () => {
    try {
      const response = await api.get(`/api/orders/${orderId}/invoice`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${orderId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("Invoice downloaded");
    } catch (error) {
      toast.error("Invoice could not be generated");
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-sm text-slate-500">Loading order details...</div>
    );
  }

  if (!order) {
    return <div className="p-6 text-sm text-slate-500">Order not found.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex gap-2">
          <button
            onClick={downloadInvoice}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            <Download className="w-4 h-4" /> Invoice
          </button>
          <button
            onClick={() =>
              window.open(`/api/orders/${orderId}/packing-slip`, "_blank")
            }
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            <FileText className="w-4 h-4" /> Packing slip
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Order #{order.id}</p>
            <h1 className="text-2xl font-bold text-slate-900">
              {order.order_number || `ORD-${order.id}`}
            </h1>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold uppercase tracking-wider text-slate-700">
            {order.status || "pending"}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Payment
            </p>
            <p className="mt-2 font-semibold text-slate-900">
              {order.payment_status || "pending"}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Amount
            </p>
            <p className="mt-2 font-semibold text-slate-900">
              ₹{Number(order.total_amount || 0).toLocaleString("en-IN")}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Quantity
            </p>
            <p className="mt-2 font-semibold text-slate-900">
              {order.quantity || 1}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-clay" />
          <h2 className="text-lg font-bold text-slate-900">
            Shipment timeline
          </h2>
        </div>
        <div className="mt-6 space-y-4">
          {timeline.length === 0 ? (
            <p className="text-sm text-slate-500">No movement recorded yet.</p>
          ) : (
            timeline.map((entry, index) => (
              <div
                key={entry.id || index}
                className="flex gap-3 rounded-xl border border-slate-200 p-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-sm font-semibold text-clay">
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {entry.status}
                  </p>
                  <p className="text-sm text-slate-600">
                    {entry.remarks || "No remarks provided"}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                    {new Date(entry.created_at).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
