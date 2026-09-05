import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard } from "lucide-react";

interface AdminPayment {
  id: string;
  userId: string;
  type: string;
  status: string;
  amountInr: number;
  amountLabel: string;
  currency: string;
  razorpayPaymentId: string | null;
  razorpayOrderId: string | null;
  razorpaySubscriptionId: string | null;
  method: string | null;
  email: string | null;
  description: string | null;
  plan: { id: string; name: string; priceLabel: string; slug: string } | null;
  fromPlan: { id: string; name: string; priceLabel: string; slug: string } | null;
  createdAt: string | null;
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

function statusBadge(status: string) {
  if (status === "captured") return <Badge className="bg-[#25D366]/15 text-[#075E54] border-[#25D366]/30">Captured</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  if (status === "refunded") return <Badge variant="secondary">Refunded</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function typeLabel(type: string) {
  switch (type) {
    case "subscription":
      return "Subscription";
    case "upgrade":
      return "Upgrade";
    case "renewal":
      return "Renewal";
    case "failed":
      return "Failed";
    case "refund":
      return "Refund";
    default:
      return type;
  }
}

export function AdminPaymentsPanel() {
  const { data, isLoading } = useQuery<{ payments: AdminPayment[] }>({
    queryKey: ["/api/admin/payments"],
  });

  const payments = data?.payments ?? [];
  const capturedTotal = payments
    .filter((p) => p.status === "captured")
    .reduce((sum, p) => sum + p.amountInr, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold">Payments</h1>
          <p className="text-sm text-muted-foreground">
            All Razorpay subscription and upgrade payments across users
          </p>
        </div>
        <Card className="min-w-[180px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Captured total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-heading text-2xl font-bold">
              ₹{capturedTotal.toLocaleString("en-IN")}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading payments…</p>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No payments recorded yet. They appear after successful checkouts and Razorpay webhooks.
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {payment.createdAt
                          ? new Date(payment.createdAt).toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">
                            {payment.user
                              ? `${payment.user.firstName || ""} ${payment.user.lastName || ""}`.trim() ||
                                payment.user.email ||
                                "User"
                              : "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {payment.user?.email || payment.email || "—"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{typeLabel(payment.type)}</TableCell>
                      <TableCell>
                        {payment.plan ? (
                          <div>
                            <p className="text-sm font-medium">{payment.plan.name}</p>
                            {payment.fromPlan && (
                              <p className="text-xs text-muted-foreground">
                                from {payment.fromPlan.name}
                              </p>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{payment.amountLabel}</TableCell>
                      <TableCell>{statusBadge(payment.status)}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[140px] truncate">
                        {payment.razorpayPaymentId || "—"}
                      </TableCell>
                      <TableCell className="capitalize text-sm">
                        {payment.method || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
