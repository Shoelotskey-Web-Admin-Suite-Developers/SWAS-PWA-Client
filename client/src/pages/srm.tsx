import { useEffect, useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import '@/styles/srm.css'
import { toast } from 'sonner'

// API Import
import { getServices, IService } from "@/utils/api/getServices";
import { getCustomerByNameAndBdate } from "@/utils/api/getCustByNameAndBdate";
import { addServiceRequest} from "@/utils/api/addServiceRequest";
import { updateDates } from "@/utils/api/updateDates";

interface LineItemInput {
  priority: "Rush" | "Normal";
  shoes: string;
  current_location?: "Hub" | "Branch";
  due_date?: string;
  services: { service_id: string; quantity: number }[];
}

interface ServiceRequestPayload {
  cust_name: string;
  cust_bdate?: string;
  cust_address?: string;
  cust_email?: string;
  cust_contact?: string;
  lineItems: LineItemInput[];
  received_by: string;
  total_amount: number;
  discount_amount: number;
  amount_paid: number;
  payment_status: "NP" | "PARTIAL" | "PAID";
  payment_mode: "Cash" | "Bank" | "GCash" | "Other";
}

type Shoe = {
  model: string;
  services: string[]; // selected service ids (standard services)
  // additionals stored as map service_id -> quantity
  additionals: Record<string, number>;
  rush: 'yes' | 'no';
}

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

const RUSH_FEE = 150 // default rush fee (change as required)
// Rush reduces the total by these many days
const RUSH_REDUCTION_DAYS = 2;

function formatCurrency(n: number) {
  return '₱' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export default function SRM() {
  // UI state
  const [customerType, setCustomerType] = useState<'new' | 'old'>('new')
  const [useCustomDate, setUseCustomDate] = useState(false)
  const [customDate, setCustomDate] = useState<string>(todayISODate())
  const [services, setServices] = useState<IService[]>([]);

  

  const serviceById = useMemo(() => {
    const map = new Map<string, IService>();
    for (const s of services) map.set(s.service_id, s);
    return map;
  }, [services]);

  // Lookup price by service_id
  const findServicePrice = (serviceId: string) => {
    const s = serviceById.get(serviceId);
    return s ? s.service_base_price : 0;
  };

  // Lookup addon price by service_id (same as above but explicit)
  const findAddonPrice = (serviceId: string) => {
    const a = serviceById.get(serviceId);
    return a ? a.service_base_price : 0;
  };

  // Lookup duration by service_id
  const getDuration = (serviceId: string) => {
    const s = serviceById.get(serviceId);
    return s ? s.service_duration : 0;
  };

  const [modeOfPayment, setModeOfPayment] = useState<'cash' | 'gcash' | 'bank' | 'other'>('cash')
  const [paymentType, setPaymentType] = useState<'full' | 'half' | 'custom'>('full')
  const [amountDueNow, setAmountDueNow] = useState(0);
  const [customerPaid, setCustomerPaid] = useState(0);
  const [change, setChange] = useState(0);
  const [balance, setBalance] = useState(0);
  const [applyDiscount, setApplyDiscount] = useState(false)
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent')

  const [submitting, setSubmitting] = useState(false);


  useEffect(() => {
    const fetchData = async () => {
      const servicesData = await getServices(); // already an array
      setServices(servicesData);
    };
    fetchData();
  }, []);

  const serviceOptions = services.filter(s => s.service_type === "Service");
  const additionalOptions = services.filter(s => s.service_type === "Additional");

  // Customer form fields (controlled)
  const [name, setName] = useState<string>('')
  const [birthdate, setBirthdate] = useState<string>('')
  const [address, setAddress] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [phone, setPhone] = useState<string>('')
  const [customerId, setCustomerId] = useState<string>('NEW')

  // Received by (user types it)
  const [receivedBy, setReceivedBy] = useState<string>('')

  // Step 2: Shoes state
  const [shoes, setShoes] = useState<Shoe[]>([
    {
      model: '',
      services: [],
      additionals: {},
      rush: 'no',
    },
  ])

  const handleShoeChange = (
    index: number,
    field: keyof Shoe,
    value: string | string[] | Record<string, number>
  ) => {
    const updated = [...shoes]
    ;(updated[index] as any)[field] = value
    setShoes(updated)
  }

  const toggleArrayValue = (
    index: number,
    field: 'services',
    value: string
  ) => {
    const updated = [...shoes]
    const currentArr = updated[index][field]
    if ((currentArr as string[]).includes(value)) {
      updated[index][field] = (currentArr as string[]).filter((v) => v !== value)
    } else {
      updated[index][field] = [...(currentArr as string[]), value]
    }
    setShoes(updated)
  }

  const addShoe = () => {
    setShoes([...shoes, { model: '', services: [], additionals: {}, rush: 'no' }])
  }

  // Toggle checkbox for additionals
  const toggleAdditional = (
    shoeIndex: number,
    serviceId: string,
    checked: boolean,
    quantity: number = 1
  ) => {
    const updated = [...shoes];
    if (checked) {
      // set quantity (default 1)
      updated[shoeIndex].additionals = {
        ...updated[shoeIndex].additionals,
        [serviceId]: Math.max(1, Math.floor(quantity)),
      };
    } else {
      // remove entry
      const { [serviceId]: _, ...rest } = updated[shoeIndex].additionals;
      updated[shoeIndex].additionals = rest;
    }
    setShoes(updated);
  };

  // Update quantity of additional
  const updateAdditionalQuantity = (
    shoeIndex: number,
    serviceId: string,
    newQuantity: number
  ) => {
    const updated = [...shoes];
    if (newQuantity <= 0) {
      const { [serviceId]: _, ...rest } = updated[shoeIndex].additionals;
      updated[shoeIndex].additionals = rest;
    } else {
      updated[shoeIndex].additionals = {
        ...updated[shoeIndex].additionals,
        [serviceId]: Math.max(1, Math.floor(newQuantity)),
      };
    }
    setShoes(updated);
  };

  // Get current quantity of a specific additional (default 1 if selected)
  const getAdditionalQuantity = (shoe: Shoe, serviceId: string) =>
    shoe.additionals[serviceId] ?? 1;


  // --- Auto-search logic (kept as you had it) ---
  useEffect(() => {
    const n = name.trim();
    const b = birthdate.trim();

    if (!n || !b) {
      setCustomerId("NEW");
      return;
    }

    const handler = setTimeout(async () => {
      try {
        const found = await getCustomerByNameAndBdate(n, b); // call backend

        if (found) {
          setAddress(found.cust_address || "");
          setEmail(found.cust_email || "");
          setPhone(found.cust_contact || "");
          setCustomerId(found.cust_id);
          if (customerType === "new") {
            setCustomerType("old");
          }
          // Notify user that an existing customer was found
          toast.success(`Customer found: ${found.cust_name || found.cust_id || ''}`)
        } else {
          setCustomerId("NEW");
          if (customerType === "old") {
            toast.error("Old customer not found. Please check the entered name and birthdate.");
          }
        }
      } catch (err) {
        console.error("Error fetching customer:", err);
        setCustomerId("NEW");
      }
    }, 1000); // debounce delay

    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, birthdate]);



  useEffect(() => {
    if (customerType === 'new') {
      setCustomerId((prev) => (prev === 'NEW' ? 'NEW' : 'NEW'))
    }
  }, [customerType])

  const [discountValue, setDiscountValue] = useState<string>('0')

  // --- Compute per-shoe totals and overall totals ---
  const perShoeTotals = useMemo(() => {
    return shoes.map((shoe) => {
      const serviceTotal = (shoe.services || []).reduce(
        (sum, serviceId) => sum + findServicePrice(serviceId),
        0
      );
      const addonTotal = Object.entries(shoe.additionals || {}).reduce(
        (sum, [addonId, qty]) => sum + findAddonPrice(addonId) * (qty || 1),
        0
      );
      const rushTotal = shoe.rush === 'yes' ? RUSH_FEE : 0;
      const shoeTotal = serviceTotal + addonTotal + rushTotal;
      return { serviceTotal, addonTotal, rushTotal, shoeTotal };
    });
  }, [shoes, serviceById]);


  const totalBill = useMemo(
    () => perShoeTotals.reduce((s, p) => s + p.shoeTotal, 0),
    [perShoeTotals]
  )

  const discountAmount = useMemo(() => {
    if (!applyDiscount) return 0
    const parsed = parseFloat(discountValue || '0') || 0
    if (discountType === 'percent') {
      // clamp percent 0..100
      const percent = Math.max(0, Math.min(parsed, 100))
      return (percent / 100) * totalBill
    } else {
      // fixed amount; clamp 0..totalBill
      return Math.max(0, Math.min(parsed, totalBill))
    }
  }, [applyDiscount, discountType, discountValue, totalBill])

  const totalSales = totalBill - discountAmount

  // Helper service request date
  const formatToMMDDYYYY = (dateInput: string | Date) => {
    const date = new Date(dateInput);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const serviceRequestDate = formatToMMDDYYYY(
    useCustomDate ? customDate : todayISODate()
  );



  // Calculate estimated completion date PER shoe
  // --- Calculate estimated completion date PER shoe (formatted only) ---
  const perShoeEstimatedDates = useMemo(() => {
    return shoes.map((shoe) => {
      let shoeDays = 0;

      // Sum durations of selected services
      (shoe.services || []).forEach((svcId) => {
        shoeDays += getDuration(svcId);
      });

      // Sum durations of selected additionals (multiply by quantity)
      Object.entries(shoe.additionals || {}).forEach(([addId, qty]) => {
        shoeDays += getDuration(addId) * (qty || 1);
      });

      // Apply rush reduction if applicable
      if (shoe.rush === "yes") {
        shoeDays = Math.max(1, shoeDays - RUSH_REDUCTION_DAYS);
      }

      // Compute estimated completion date
      const estDate = new Date(useCustomDate ? customDate : todayISODate());
      estDate.setDate(estDate.getDate() + shoeDays);

      // Format as MM/DD/YYYY
      const month = String(estDate.getMonth() + 1).padStart(2, "0");
      const day = String(estDate.getDate()).padStart(2, "0");
      const year = estDate.getFullYear();

      return `${month}/${day}/${year}`;
    });
  }, [shoes, customDate, useCustomDate, serviceById]);



  // Auto-update Amount Due Now when payment type or totals change
  useEffect(() => {
    if (paymentType === "full") {
      setAmountDueNow(totalSales);
    } else if (paymentType === "half") {
      setAmountDueNow(totalSales * 0.5);
    }
  }, [paymentType, totalSales]);

  // Auto-update Change & Balance
  useEffect(() => {
    setChange(Math.max(0, customerPaid - amountDueNow));
    setBalance(Math.max(0, totalSales - amountDueNow));
  }, [customerPaid, amountDueNow, totalSales]);

  // Explicitly type the value as string or number
  const handleAmountDueChange = (value: string | number) => {
    const num = Math.max(0, Math.min(Number(value) || 0, totalSales));
    setPaymentType("custom");
    setAmountDueNow(num);
  };

  const handleConfirmServiceRequest = async () => {
    // --- 1. Validate required fields ---
    if (!name.trim() || !birthdate.trim() || !address.trim()) {
      toast.error("Please fill in all customer details.")
      return;
    }

    // Require at least one contact (phone or email)
    if (!phone.trim() && !email.trim()) {
      toast.error("Please provide at least one contact: phone number or email.")
      return;
    }

    // If email provided, validate simple email format
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.trim())) {
        toast.error("Please enter a valid email address.")
        return;
      }
    }

    // ReceivedBy guard
    if (!receivedBy.trim()) {
      toast.error("Please enter 'Received By' name.")
      return;
    }

    // Cashier guard (must be provided)
    if (!cashier.trim()) {
      toast.error("Please enter cashier name.")
      return;
    }

    if (shoes.length === 0) {
      toast.error("Please provide at least one shoe with a model name.")
      return;
    }

    // Validate each shoe has a model and at least one service
    for (let i = 0; i < shoes.length; i++) {
      const shoe = shoes[i];
      if (!shoe.model || !shoe.model.trim()) {
        toast.error(`Please provide a name/model for shoe #${i + 1}.`)
        return;
      }
      if (!shoe.services || shoe.services.length === 0) {
        toast.error(`Please select at least one service for shoe "${shoe.model || `#${i + 1}`}".`)
        return;
      }
    }

    // --- 2. Prepare line items ---
    // If discount is applied, validate discountValue is a number and in valid range
    if (applyDiscount) {
      const parsed = parseFloat(discountValue || '')
      if (Number.isNaN(parsed)) {
        toast.error('Please enter a numeric discount value.')
        return
      }
      if (discountType === 'percent' && (parsed < 0 || parsed > 100)) {
        toast.error('Percent discount must be between 0 and 100.')
        return
      }
      if (discountType === 'fixed' && (parsed < 0 || parsed > totalBill)) {
        toast.error('Fixed discount must be between 0 and the total bill.')
        return
      }
    }

    const lineItems: LineItemInput[] = shoes.map((shoe, idx) => {
      const svcObjs = shoe.services.map(id => ({
        service_id: id,
        quantity: 1,
        is_additional: false,
      }));

      const addObjs = Object.entries(shoe.additionals).map(([id, qty]) => ({
        service_id: id,
        quantity: qty,
        is_additional: true,
      }));

      const due_date = perShoeEstimatedDates[idx] || "";

      return {
        priority: (shoe.rush === "yes" ? "Rush" : "Normal") as "Rush" | "Normal",
        shoes: shoe.model,
        current_location: "Branch",
        due_date,
        services: [...svcObjs, ...addObjs], // merged
      };
    });

    // --- 3. Prepare service request payload ---
    const paymentMap: Record<string, "Cash" | "GCash" | "Bank" | "Other"> = {
      cash: "Cash",
      gcash: "GCash",
  bank: "Bank",
      other: "Other",
    };

    const requestPayload: ServiceRequestPayload = {
      cust_name: name,
      cust_bdate: birthdate || undefined,
      cust_address: address || undefined,
      cust_email: email || undefined,
      cust_contact: phone || undefined,
      lineItems,
      received_by: receivedBy,
      total_amount: totalSales, // ✅ no discount subtraction
      discount_amount: discountAmount,
      amount_paid: amountDueNow, // ✅ from amount due now input
      payment_status:
        amountDueNow >= totalSales
          ? "PAID"
          : amountDueNow > 0
          ? "PARTIAL"
          : "NP",
      payment_mode: paymentMap[modeOfPayment],
    };

    try {
      setSubmitting(true);
      const result = await addServiceRequest(requestPayload as any);
    console.log("Service request created:", result);
    toast.success("Service request confirmed successfully!");

// --- Add Dates entry for each line item ---
if (result?.lineItems && Array.isArray(result.lineItems)) {
  const now = new Date().toISOString();
  await Promise.all(
    result.lineItems.map(async (li: any) => {
      try {
        await updateDates(li.line_item_id, {
          srm_date: now,
          current_status: 1,
        });
      } catch (err) {
        console.error(`Failed to create Dates for line_item_id ${li.line_item_id}:`, err);
      }
    })
  );
}

      // Clear all form fields after successful submission
      clearAllFields();

      // --- 4. PDF Export logic ---
      const transactionId = result?.transaction?.transaction_id;
    if (transactionId) {
        const [{ exportReceiptPDF }, { getTransactionById }, { getBranchByBranchId }, { getServiceById }] = await Promise.all([
          import("@/utils/exportReceiptPDF"),
          import("@/utils/api/getTransactionById"),
          import("@/utils/api/getBranchByBranchId"),
          import("@/utils/api/getServiceById"),
        ]);

        const transactionData = await getTransactionById(transactionId);
        const branchId = sessionStorage.getItem("branch_id") || "";
        const branchObj = branchId ? await getBranchByBranchId(branchId) : null;
        const branch = branchObj ? branchObj.branch_name || branchObj.branch_id : branchId || "Unknown Branch";

        // Enrich line items: replace service ids with full service objects
        const pdfShoes = [] as any[];
        for (const li of (transactionData.lineItems || [])) {
          const services = [] as any[];
          const additionals = [] as any[];

          for (const s of (li.services || [])) {
            const svc = await getServiceById(s.service_id);
            const enriched = {
              service_id: s.service_id,
              quantity: s.quantity,
              is_additional: !!s.is_additional,
              service_name: svc ? svc.service_name : s.service_id,
              service_base_price: svc ? svc.service_base_price : 0,
              service_duration: svc ? svc.service_duration : 0,
            };
            if (s.is_additional) additionals.push(enriched);
            else services.push(enriched);
          }

          pdfShoes.push({
            model: li.shoes,
            rush: li.priority === "Rush",
            rushFee: li.priority === "Rush" ? RUSH_FEE : 0,
            services,
            additionals,
            subtotal: li.subtotal || 0,
            estimated_completion: li.due_date || "",
          });
        }

        // If the transaction contains payment ids, fetch each payment object and include them
        let enrichedPayments: any[] = []
        try {
          const paymentIds = Array.isArray(transactionData.transaction.payments) ? transactionData.transaction.payments : [];
          if (paymentIds.length > 0) {
            const { getPaymentById } = await import("@/utils/api/getPaymentById");
            const fetched = await Promise.all(paymentIds.map(async (pid: string) => {
              try {
                const p = await getPaymentById(pid);
                return p || { payment_id: pid };
              } catch (e) {
                console.debug('Failed to fetch payment', pid, e);
                return { payment_id: pid };
              }
            }));
            enrichedPayments = fetched;
          }
        } catch (e) {
          console.debug('Error enriching payments for pdf', e);
        }

        // Try to fetch latest payment for this transaction to include its id as a header
        let latestPaymentId: string | null = null
        try {
          const { getLatestPaymentByTransactionId } = await import("@/utils/api/getLatestPaymentByTransactionId")
          const latest = await getLatestPaymentByTransactionId(transactionId)
          if (latest && latest.payment_id) latestPaymentId = latest.payment_id
        } catch (e) {
          // ignore - it's optional
          console.debug('Failed to fetch latest payment for header', e)
        }

        const pdfData = {
          latest_payment_id: latestPaymentId,
          transaction_id: transactionData.transaction.transaction_id,
          cust_name: transactionData.customer.cust_name,
          cust_id: transactionData.customer.cust_id,
          cust_address: transactionData.customer.cust_address,
          date_in: transactionData.transaction.date_in,
          date_out: transactionData.transaction.date_out,
          received_by: cashier,
          payment_mode: transactionData.transaction.payment_mode,
          discountAmount: transactionData.transaction.discount_amount,
          total_amount: transactionData.transaction.total_amount,
          amount_paid: transactionData.transaction.amount_paid,
          // For payments, include full payment objects (if available) so the PDF can list them like shoes
          payments: enrichedPayments.length > 0 ? enrichedPayments : (transactionData.transaction.payments || []),
          // Also keep legacy single payment field but prefer first enriched payment amount when present
          payment: enrichedPayments.length > 0 ? Number(enrichedPayments[0].payment_amount || enrichedPayments[0].paymentAmount || 0) : customerPaid,
          change: change,
          shoes: pdfShoes,
        };

        exportReceiptPDF({
          type: "acknowledgement-receipt",
          data: pdfData,
          branch,
        });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to create service request.");
    } finally {
      setSubmitting(false);
    }
  };



  // Cashier input state
  const [cashier, setCashier] = useState("");

  // Function to clear all form fields to initial state
  const clearAllFields = () => {
    // Reset customer form
    setCustomerType('new');
    setUseCustomDate(false);
    setCustomDate(todayISODate());
    setName('');
    setBirthdate('');
    setAddress('');
    setEmail('');
    setPhone('');
    setCustomerId('NEW');
    setReceivedBy('');
    
    // Reset shoes
    setShoes([{
      model: '',
      services: [],
      additionals: {},
      rush: 'no',
    }]);
    
    // Reset payment fields
    setModeOfPayment('cash');
    setPaymentType('full');
    setAmountDueNow(0);
    setCustomerPaid(0);
    setChange(0);
    setBalance(0);
    setApplyDiscount(false);
    setDiscountType('percent');
    setDiscountValue('0');
    setCashier('');
  };

  return (
    <div className="srm-container">
      {/* Left: Form */}
      <div className="srm-form-container">
        <div className="srm-form">
          <div className="customer-type-toggle">
            <Button
              className="customer-button button-lg"
              variant={customerType === 'new' ? 'customer' : 'outline'}
              onClick={() => {
                setCustomerType('new')
                // Clear customer contact fields when switching to new customer
                setAddress('')
                setEmail('')
                setPhone('')
              }}
            >
              NEW CUSTOMER
            </Button>
            <Button
              className="customer-button button-lg"
              variant={customerType === 'old' ? 'customer' : 'outline'}
              onClick={() => setCustomerType('old')}
            >
              OLD CUSTOMER
            </Button>
          </div>

          <Card>
            <CardContent className="form-card-content">
              {/* Customer Info */}
              <div className="customer-info-grid">
                <div className="customer-info-pair">
                  <div className="w-full">
                    <Label>Customer Name</Label>
                    <Input
                      value={name}
                      onChange={(e: any) => setName(e.target.value)}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="w-full">
                    <Label>Customer Birthdate</Label>
                    <Input
                      type="date"
                      value={birthdate}
                      onChange={(e: any) => setBirthdate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="w-full">
                  <Label>Customer Address</Label>
                  <Input
                    value={address}
                    onChange={(e: any) => setAddress(e.target.value)}
                    readOnly={customerType === 'old'}
                    placeholder="Address"
                  />
                </div>

                <div className="customer-info-pair">
                  <div  className="w-full">
                    <Label>Customer Email</Label>
                    <Input
                      value={email}
                      onChange={(e: any) => setEmail(e.target.value)}
                      readOnly={customerType === 'old'}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div  className="w-full">
                    <Label>Customer Phone Number</Label>
                    <Input
                      value={phone}
                      onChange={(e: any) => setPhone(e.target.value)}
                      readOnly={customerType === 'old'}
                      placeholder="09XXXXXXXXX"
                    />
                  </div>
                </div>

                <div className="customer-info-pair">
                  <div  className="w-full">
                    <div >
                      <Label>Set Custom Date</Label>
                      <Switch
                        className="ml-3"
                        checked={useCustomDate}
                        onCheckedChange={(val: any) => {
                          setUseCustomDate(!!val)
                          if (!useCustomDate) {
                            setCustomDate((prev) => prev || todayISODate())
                          }
                        }}
                      />
                    </div>
                    <div>
                      <Input
                        type="date"
                        disabled={!useCustomDate}
                        value={customDate}
                        onChange={(e: any) => setCustomDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="w-full">
                    <Label>Received by</Label>
                    <Input
                      value={receivedBy}
                      onChange={(e: any) => setReceivedBy(e.target.value)}
                      placeholder="Type receiver name"
                    />
                  </div>
                </div>
              </div>

              <hr className="section-divider" />

              {shoes.map((shoe, i) => (
                <div key={i} className="shoe-info-grid mb-6 relative">
                  {/* Show X button only if more than 1 shoe */}
                  {shoes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...shoes]
                        updated.splice(i, 1)
                        setShoes(updated)
                      }}
                      className="absolute pl-2 pr-2 pt-0 pb-0 top-[-1.5rem] right-0 m-0 bg-transparent text-gray-600 font-bold text-xl hover:text-red-900"
                      aria-label={`Remove shoe ${shoe.model || i + 1}`}
                    >
                      &times;
                    </button>
                  )}

                  <div className="shoe-model">
                    <Label>Shoe Model</Label>
                    <Input
                      value={shoe.model}
                      onChange={(e) => handleShoeChange(i, 'model', e.target.value)}
                    />
                  </div>
                  <div className="services">
                    {/* rest of your existing shoe fields */}
                    <div>
                      <Label>Service Needed</Label>
                      <div className="checkbox-grid">
                        {serviceOptions.map((srv) => (
                            <div className="checkbox-item" key={srv.service_id}>
                              <Checkbox
                                checked={shoe.services.includes(srv.service_id)}
                                onCheckedChange={() => toggleArrayValue(i, "services", srv.service_id)}
                              />
                              <Label>{srv.service_name}</Label>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div>
                    <Label>Additional</Label>
                    <div className="checkbox-grid">
                      {additionalOptions.map((add) => {
                        const quantity = getAdditionalQuantity(shoe, add.service_id);
                        const checked = Object.prototype.hasOwnProperty.call(shoe.additionals, add.service_id);

                        // Only "Additional Layer" shows increment/decrement controls
                        const isLayer = add.service_name === 'Additional Layer';

                        return (
                          <div className="checkbox-item flex items-center gap-2" key={add.service_id}>
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(val) =>
                                toggleAdditional(i, add.service_id, !!val, quantity)
                              }
                            />
                            <Label>{add.service_name}</Label>
                            {checked && (
                              <div className="flex items-center ml-2">
                                {isLayer ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => updateAdditionalQuantity(i, add.service_id, Math.max(1, quantity - 1))}
                                      className="w-5 h-8 flex px-4 items-center justify-center bg-gray-200 rounded"
                                    >
                                      <small className="text-sm">-</small>
                                    </button>
                                    <span className="px-2">{quantity}</span>
                                    <button
                                      type="button"
                                      onClick={() => updateAdditionalQuantity(i, add.service_id, quantity + 1)}
                                      className="w-5 h-8 flex px-4 items-center justify-center bg-gray-200 rounded"
                                    >
                                      <span className="text-sm">+</span>
                                    </button>
                                  </>
                                ) : (
                                  // For non-layer additionals, show quantity only (no +/-)
                                  <span className="px-2"></span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>


                    <div className="pr-[2rem]">
                      <Label>Rush</Label>
                      <RadioGroup
                        value={shoe.rush}
                        onValueChange={(val) => handleShoeChange(i, 'rush', val as 'yes' | 'no')}
                        className="rush-options"
                      >
                        <div className="radio-option">
                          <RadioGroupItem value="yes" id={`rush-yes-${i}`} />
                          <Label htmlFor={`rush-yes-${i}`}>Yes</Label>
                        </div>
                        <div className="radio-option">
                          <RadioGroupItem value="no" id={`rush-no-${i}`} />
                          <Label htmlFor={`rush-no-${i}`}>No</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </div>
              ))}


              {/* Modern Add Shoe UI */}
              <div className="add-shoe-wrapper" role="group" aria-label="Add another shoe">
                <Button
                  type="button"
                  variant="outline"
                  className="add-shoe-modern add-shoe-red"
                  onClick={addShoe}
                >
                  <Plus className="add-shoe-icon" aria-hidden="true" />
                  <h3 className="add-shoe-text">Add Shoe</h3>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Payment Section (Step 1: show totals computed) */}
          <Card>
            <CardContent className="payment-section">
              {/* Left: Discount Section */}
              <div className="discount-section">
                <div className="flex flex-col gap-5">
                  <Label>Cashier</Label>
                  <Input
                    value={cashier}
                    onChange={e => setCashier(e.target.value)}
                    placeholder="Enter cashier name"
                  />
                </div>

                <div className="flex flex-col gap-5">
                  <Label>Mode of Payment</Label>
                  <RadioGroup
                    value={modeOfPayment}
                    onValueChange={(val) => setModeOfPayment(val as 'cash' | 'gcash' | 'bank' | 'other')}
                    className="pl-10"
                  >
                    <div className="radio-option">
                      <RadioGroupItem value="cash" id="cash" />
                      <Label htmlFor="cash">Cash</Label>
                    </div>
                    <div className="radio-option">
                      <RadioGroupItem value="gcash" id="gcash" />
                      <Label htmlFor="gcash">GCash</Label>
                    </div>
                    <div className="radio-option">
                      <RadioGroupItem value="bank" id="bank" />
                      <Label htmlFor="bank">Bank</Label>
                    </div>
                    <div className="radio-option">
                      <RadioGroupItem value="other" id="other" />
                      <Label htmlFor="other">Other</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="checkbox-item">
                  <Checkbox
                    checked={applyDiscount}
                    onCheckedChange={(checked) => setApplyDiscount(!!checked)}
                    id="apply-discount"
                  />
                  <Label htmlFor="apply-discount">Apply Discount</Label>
                </div>

                {applyDiscount && (
                  <div className="discount-type pl-10">
                    <RadioGroup
                      value={discountType}
                      onValueChange={(val) =>
                        setDiscountType(val as 'percent' | 'fixed')
                      }
                    >
                      <div className="radio-option">
                        <RadioGroupItem value="percent" id="percent" />
                        <Label htmlFor="percent">Percent Discount (%)</Label>
                      </div>
                      <div className="radio-option">
                        <RadioGroupItem value="fixed" id="fixed" />
                        <Label htmlFor="fixed">Fixed Amount Discount (₱)</Label>
                      </div>
                    </RadioGroup>
                    <Input
                      className="mt-3"
                      placeholder={
                        discountType === 'percent' ? 'Enter %' : 'Enter amount'
                      }
                      value={discountValue}
                      onChange={(e: any) => setDiscountValue(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Right: Payment Inputs */}
              <div className="payment-summary-section">
                <div className="payment-type-buttons">
                  <Button
                    className="payment-button"
                    variant={paymentType === 'full' ? 'selected' : 'unselected'}
                    onClick={() => setPaymentType('full')}
                  >
                    Full Payment
                  </Button>
                  <Button
                    className="payment-button"
                    variant={paymentType === 'half' ? 'selected' : 'unselected'}
                    onClick={() => setPaymentType('half')}
                  >
                    50% Down
                  </Button>
                  <Button
                    className="payment-button"
                    variant={paymentType === 'custom' ? 'selected' : 'unselected'}
                    onClick={() => setPaymentType('custom')}
                  >
                    Custom
                  </Button>
                </div>

                <div className="summary-grid">
                  <p>Total Bill:</p>
                  <p className="text-right pr-3">{formatCurrency(totalBill)}</p>

                  <p>Total Sales:</p>
                  <p className="text-right pr-3">{formatCurrency(totalSales)}</p>

                  <p>Amount Due Now:</p>
                  <Input
                    type="number"
                    className="text-right"
                    value={amountDueNow}
                    onChange={(e) => handleAmountDueChange(e.target.value)}
                  />


                  <p>Customer Paid:</p>
                  <Input
                    className="text-right"
                    type="number"
                    value={customerPaid}
                    onChange={(e) => setCustomerPaid(Number(e.target.value) || 0)}
                    onBlur={() => {
                      // Only enforce when there is an amount due now (>0)
                      if (amountDueNow > 0 && customerPaid < amountDueNow) {
                        toast.error('Amount paid cannot be lower than amount due now.')
                      }
                    }}
                  />

                  <p>Change:</p>
                  <p className="text-right pr-3">{formatCurrency(change)}</p>
                </div>

              </div>
            </CardContent>
          </Card>
          <hr className="bottom-space" />
        </div>
      </div>

      {/* Right: Request Summary */}
      <div className="srm-summary">
        <Card className="srm-summary-card">
          <CardContent className="srm-summary-content">
            <h1>Request Summary</h1>
            <hr className="section-divider" />
            <div className="srm-summary-body">
              <div className="summary-grid">
                <p className="bold">Customer ID</p>
                <p className="text-right">
                  {customerId === 'NEW' ? 'NEW' : `#${customerId}`}
                </p>
                <p className="bold">Customer Name</p>
                <p className="text-right">{name || '-'}</p>
              </div>

              <div className="summary-date-row">
                <p className="bold">Service Request</p>
                <p className="text-right">{serviceRequestDate}</p>
              </div>

              {/* Services with actual prices */}
              <div className="summary-service-list">
                {shoes.map((shoe, i) => (
                  <div className="summary-service-entry mb-5" key={i}>
                    <p className="font-medium">{shoe.model || 'Unnamed Shoe'}</p>

                    {shoe.services.map((srvId) => {
                      const svc = serviceById.get(srvId);
                      return (
                        <div key={srvId} className="pl-10 flex justify-between">
                          <p>{svc ? svc.service_name : srvId}</p>
                          <p className="text-right">{formatCurrency(svc ? svc.service_base_price : 0)}</p>
                        </div>
                      );
                    })}

                    {Object.entries(shoe.additionals).map(([addId, qty]) => {
                      const addon = serviceById.get(addId);
                      return (
                        <div key={`${addId}-${i}`} className="pl-10 flex justify-between">
                          <p>{addon ? addon.service_name : addId} {qty > 1 ? ` x${qty}` : ''}</p>
                          <p className="text-right">{formatCurrency((addon ? addon.service_base_price : 0) * qty)}</p>
                        </div>
                      );
                    })}

                    {shoe.rush === 'yes' && (
                      <div className="pl-10 flex justify-between text-red-600">
                        <p>Rush Service</p>
                        <p className="text-right">{formatCurrency(RUSH_FEE)}</p>
                      </div>
                    )}
                    
                    <hr className="total" />
                    {/* Per-shoe subtotal */}
                    <div className="pl-10 flex justify-between mt-2">
                      <p className="bold">Subtotal</p>
                      <p className="text-right bold">
                        {formatCurrency(perShoeTotals[i]?.shoeTotal || 0)}
                      </p>
                    </div>

                    {/* Per-shoe estimated completion date */}
                    <div className="pl-10 flex justify-between mt-1 text-gray-500">
                      <p className="bold">Estimated Completion</p>
                      <p className="text-right bold">{perShoeEstimatedDates[i]}</p>
                    </div>
                  </div>
                ))}
              </div>

              {applyDiscount && (
                <div className="summary-discount-row">
                  <p className="bold">Discount</p>
                  <p>({formatCurrency(discountAmount)})</p>
                </div>
              )}
              <div className="summary-discount-row">
                <p className="bold">Payment</p>
                <p>({formatCurrency(amountDueNow)})</p>
              </div>
            </div>

            <hr className="section-divider" />
            <div className="summary-footer">
              <div className="summary-balance-row">
                <h2>Balance:</h2>
                {/* Since Amount Due / Payments not implemented yet, show total sales as current balance */}
                <h2>{formatCurrency(balance)}</h2>
              </div>
                <Button
                  disabled={submitting}
                  className="w-full p-8 mt-4 button-lg bg-[#22C55E] hover:bg-[#1E9A50]"
                  onClick={handleConfirmServiceRequest}
                >
                  {submitting ? "Submitting..." : "Confirm Service Request"}
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
