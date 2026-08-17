import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, ReceiptText, UserRound } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import '@/styles/srm.css'
import { toast } from 'sonner'

// API Import
import { getServices, IService } from "@/utils/api/getServices";
import { getCustomerSummaries } from "@/utils/api/getCustomerSumamries";
import { addServiceRequest} from "@/utils/api/addServiceRequest";
import { updateDates } from "@/utils/api/updateDates";
import { getUserName } from "@/utils/api/getUserName";

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
// Rush reduces the total processing days by a percentage (40% of total days).
// We compute reduction = max(1, floor(totalDays * 0.4)) to ensure at least 1 day is reduced.
const RUSH_REDUCTION_PCT = 0.4

function formatCurrency(n: number) {
  return '₱' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export default function SRM() {
  // UI state
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

  useEffect(() => {
    const fetchCashierName = async () => {
      const userId = sessionStorage.getItem("user_id");
      if (!userId) {
        return;
      }

      try {
        const result = await getUserName(userId);
        const resolvedName = result?.user_name && result.user_name.trim().length > 0
          ? result.user_name.trim()
          : userId;
        setCashier(resolvedName);
        setCashierDefault(resolvedName);
      } catch (error) {
        console.error("Failed to fetch cashier name:", error);
        setCashier(userId);
        setCashierDefault(userId);
      }
    };

    fetchCashierName();
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
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false)
  const [customerDraft, setCustomerDraft] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    birthdate: '',
  })
  const [customerSummaries, setCustomerSummaries] = useState<
    {
      cust_id: string
      cust_name: string
      cust_bdate?: string | null
      cust_address?: string | null
      cust_email?: string | null
      cust_contact?: string | null
      is_archive?: boolean
    }[]
  >([])
  const populatingFromLookup = useRef(false)
  const lastAutoMatchedName = useRef<string>('')

  interface CustomerLookupResult {
    cust_id?: string
    cust_name?: string
    cust_bdate?: string | null
    cust_address?: string | null
    cust_email?: string | null
    cust_contact?: string | null
  }

  const populateCustomerFields = (
    customer: CustomerLookupResult | null,
    options?: { guardEffect?: boolean }
  ) => {
    if (!customer) return

    const guardEffect = options?.guardEffect ?? true
    if (guardEffect) {
      populatingFromLookup.current = true
    }

    setName(customer.cust_name ?? '')
    setAddress(customer.cust_address ?? '')
    setEmail(customer.cust_email ?? '')
    setPhone(customer.cust_contact ?? '')
  setCustomerId(customer.cust_id ?? 'NEW')

    if (customer.cust_bdate) {
      try {
        const parsed = new Date(customer.cust_bdate)
        if (!Number.isNaN(parsed.getTime())) {
          const y = parsed.getFullYear()
          const m = String(parsed.getMonth() + 1).padStart(2, '0')
          const d = String(parsed.getDate()).padStart(2, '0')
          setBirthdate(`${y}-${m}-${d}`)
        } else {
          setBirthdate('')
        }
      } catch {
        setBirthdate('')
      }
    } else {
      setBirthdate('')
    }

  }

  const openCustomerModal = () => {
    setCustomerDraft({
      name,
      phone,
      email,
      address,
      birthdate,
    })
    setIsCustomerModalOpen(true)
  }

  const saveCustomerFromModal = () => {
    const trimmedName = customerDraft.name.trim()
    if (!trimmedName) {
      toast.error('Customer name is required.')
      return
    }

    setName(trimmedName)
    setPhone(customerDraft.phone.trim())
    setEmail(customerDraft.email.trim())
    setAddress(customerDraft.address.trim())
    setBirthdate(customerDraft.birthdate)
    setIsCustomerModalOpen(false)
  }

  // Step 2: Shoes state
  const [shoes, setShoes] = useState<Shoe[]>([
    {
      model: '',
      services: [],
      additionals: {},
      rush: 'no',
    },
  ])
  const [activeShoeIndex, setActiveShoeIndex] = useState(0)
  const [serviceTab, setServiceTab] = useState<'all' | 'service' | 'additional'>('all')

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
    const newShoe: Shoe = { model: '', services: [], additionals: {}, rush: 'no' }
    const updated = [...shoes, newShoe]
    setShoes(updated)
    setActiveShoeIndex(updated.length - 1)
  }

  const removeShoe = (index: number) => {
    if (shoes.length <= 1) return
    const updated = [...shoes]
    updated.splice(index, 1)
    setShoes(updated)

    setActiveShoeIndex((prev) => {
      if (prev === index) return Math.max(0, index - 1)
      if (prev > index) return prev - 1
      return prev
    })
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

  const activeShoe = shoes[activeShoeIndex] ?? shoes[0]

  const visibleServiceCards = useMemo(() => {
    if (serviceTab === 'service') return serviceOptions
    if (serviceTab === 'additional') return additionalOptions
    return services
  }, [serviceTab, serviceOptions, additionalOptions, services])


  useEffect(() => {
    const fetchCustomerSummaries = async () => {
      try {
        const summaries = await getCustomerSummaries(false)
        setCustomerSummaries(summaries)
      } catch (error) {
        console.error('Failed to load customer summaries:', error)
      }
    }

    fetchCustomerSummaries()
  }, [])

  // --- Auto-search logic: Name only (exact match, case-insensitive) ---
  useEffect(() => {
    if (populatingFromLookup.current) {
      populatingFromLookup.current = false
      return
    }

    const n = name.trim();

    if (!n) {
      setCustomerId("NEW");
      lastAutoMatchedName.current = ''
      return;
    }

    const handler = setTimeout(async () => {
      try {
        const normalized = n.toLowerCase()
        const matches = customerSummaries.filter((customer) => {
          if (customer.is_archive) return false
          return (customer.cust_name || '').trim().toLowerCase() === normalized
        })

        if (matches.length === 1) {
          const found = matches[0]
          populateCustomerFields(found, { guardEffect: false })
          if (lastAutoMatchedName.current !== normalized) {
            toast.success(`Customer found: ${found.cust_name || found.cust_id || ''}`)
            lastAutoMatchedName.current = normalized
          }
        } else {
          setCustomerId("NEW");
          lastAutoMatchedName.current = ''
        }
      } catch (err) {
        console.error("Error fetching customer:", err);
        setCustomerId("NEW");
        lastAutoMatchedName.current = ''
      }
    }, 1000); // debounce delay

    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, customerSummaries]);

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
  /*const formatToMMDDYYYY = (dateInput: string | Date) => {
  const date = new Date(dateInput);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const serviceRequestDate = formatToMMDDYYYY(
   useCustomDate ? customDate : todayISODate()
  ); */



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

      // Apply rush reduction if applicable: subtract 40% of total days (minimum 1 day)
      if (shoe.rush === "yes") {
        const reduction = Math.max(1, Math.floor(shoeDays * RUSH_REDUCTION_PCT))
        shoeDays = Math.max(1, shoeDays - reduction)
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
    if (!name.trim() || !address.trim()) {
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
    if (amountDueNow > 0 && customerPaid < amountDueNow) {
      toast.error('Amount paid cannot be lower than amount due now.');
      return;
    }

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
      received_by: cashier,
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
    setIsCheckoutModalOpen(false)

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
  const [cashierDefault, setCashierDefault] = useState("");

  // Function to clear all form fields to initial state
  const clearAllFields = () => {
    // Reset customer form
    setUseCustomDate(false);
    setCustomDate(todayISODate());
    setName('');
    setBirthdate('');
    setAddress('');
    setEmail('');
    setPhone('');
    setCustomerId('NEW');
    lastAutoMatchedName.current = ''
    
    // Reset shoes
    setShoes([{
      model: '',
      services: [],
      additionals: {},
      rush: 'no',
    }]);
    setActiveShoeIndex(0)
    
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
    setCashier(cashierDefault);
  };

  return (
    <div className="srm-container">
      {/* Left: Form */}
      <div className="srm-form-container">
        <div className="srm-top-spacer" />
        <div className="srm-form">
          
              {/* Customer Info */}
              <div className="srm-top-strip mb-2">
                <div className="srm-top-panel customer-panel">
                  <Label className="top-panel-label">Customer Information</Label>
                  <div className="customer-name-row">
                    <div className="w-full">
                      <div className="input-with-icon">
                        <i className="bi-person input-icon"></i>

                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Search or add customer"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="customer-add-button"
                      onClick={openCustomerModal}
                      aria-label="Add new customer"
                    >
                      <Plus className="h-5 w-5" aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                <div className="srm-top-shoe-panel active-shoe-panel">
                  <div className="active-shoe-head">
                    <Label className="top-panel-label">Active Shoe Details</Label>
                    <span className="active-shoe-badge">Shoe #{activeShoeIndex + 1}</span>
                  </div>
                  <div className="input-with-icon">
                        <i className="bi-tag input-icon"></i>

                        <Input
                          value={activeShoe?.model || ''}
                          onChange={(e) => handleShoeChange(activeShoeIndex, 'model', e.target.value)}
                          placeholder="Enter Shoe Model"
                        />
                      </div>
                </div>

                <div className="srm-top-panel date-panel">
                  <div className="date-switch-row">
                    <Label className="top-panel-label">Date</Label>
                    <Switch
                      checked={useCustomDate}
                      onCheckedChange={(val: any) => {
                        setUseCustomDate(!!val)
                        if (!useCustomDate) {
                          setCustomDate((prev) => prev || todayISODate())
                        }
                      }}
                    />
                    <span>Use custom date</span>
                  </div>
                  <div className="input-with-icon">
                        <i className="bi-calendar2 input-icon"></i>
                        <Input
                          type="date"
                          disabled={!useCustomDate}
                          value={customDate}
                          onChange={(e: any) => setCustomDate(e.target.value)}
                        />
                      </div>
                </div>

                <div className="srm-top-strip rush-row">
                  <button
                    type="button"
                    className={`rush-toggle ${activeShoe.rush === 'yes' ? 'active' : ''}`}
                    onClick={() =>
                      handleShoeChange(
                        activeShoeIndex,
                        'rush',
                        activeShoe.rush === 'yes' ? 'no' : 'yes'
                      )
                    }
                  >
                    <i className="bi-lightning-fill"></i>
                    RUSH
                  </button>
                </div>
              </div>

              <div className="shoe-selector-row" role="group" aria-label="Shoes in this transaction">
                <div className="shoe-chip-list">
                  {shoes.map((shoe, i) => (
                    <div className={`shoe-chip ${i === activeShoeIndex ? 'active' : ''}`} key={`${shoe.model}-${i}`}>
                      <button
                        type="button"
                        className="shoe-chip-main"
                        onClick={() => setActiveShoeIndex(i)}
                        aria-label={`Select shoe ${i + 1}`}
                      >
                        {`Shoe #${i + 1}: ${shoe.model?.trim() || 'Unnamed Shoe'}`}
                      </button>
                      {shoes.length > 1 && (
                        <button
                          type="button"
                          className="shoe-chip-remove"
                          onClick={() => removeShoe(i)}
                          aria-label={`Remove shoe ${shoe.model || i + 1}`}
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="shoe-add-circle"
                  onClick={addShoe}
                  aria-label="Add another shoe"
                >
                  <i className="bi-plus"></i>
                </button>
              </div>

              {activeShoe && (
                <div className="shoe-editor-pane mb-6">
                  <div className="service-tabs" role="tablist" aria-label="Service filters">
                    <button
                      type="button"
                      className={`service-tab ${serviceTab === 'all' ? 'active' : ''}`}
                      onClick={() => setServiceTab('all')}
                    >
                      <i className="bi-grid"></i>
                      All
                    </button>
                    <button
                      type="button"
                      className={`service-tab ${serviceTab === 'service' ? 'active' : ''}`}
                      onClick={() => setServiceTab('service')}
                    >
                      <i className="bi-gear"></i>
                      Services
                    </button>
                    <button
                      type="button"
                      className={`service-tab ${serviceTab === 'additional' ? 'active' : ''}`}
                      onClick={() => setServiceTab('additional')}
                    >
                      <i className="bi-brush"></i>
                      Additional
                    </button>
                  </div>

                  <div className="service-card-grid">
                    {visibleServiceCards.map((svc) => {
                      const isAdditional = svc.service_type === 'Additional'
                      const checked = isAdditional
                        ? Object.prototype.hasOwnProperty.call(activeShoe.additionals, svc.service_id)
                        : activeShoe.services.includes(svc.service_id)
                      const quantity = getAdditionalQuantity(activeShoe, svc.service_id)
                      const isLayer = svc.service_name === 'Additional Layer'

                      return (
                        <div
                          className={`service-card ${checked ? 'selected' : ''}`}
                          key={svc.service_id}
                          onClick={() => {
                            if (isAdditional) {
                              toggleAdditional(activeShoeIndex, svc.service_id, !checked, quantity);
                              return;
                            }
                            toggleArrayValue(activeShoeIndex, 'services', svc.service_id);
                          }}
                        >
                          <div className="service-card-head">
                            <p className="service-card-name">{svc.service_name}</p>
                            <p className="service-card-price">{formatCurrency(svc.service_base_price)}</p>
                          </div>

                          <div className="service-card-meta">
                            <span>{svc.service_type}</span>
                            <span>{svc.service_duration} day(s)</span>
                          </div>

                          {checked && isAdditional && isLayer && (
                            <div className="service-card-qty" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() =>
                                  updateAdditionalQuantity(
                                    activeShoeIndex,
                                    svc.service_id,
                                    Math.max(1, quantity - 1)
                                  )
                                }
                              >
                                -
                              </button>
                              <span>{quantity}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateAdditionalQuantity(activeShoeIndex, svc.service_id, quantity + 1)
                                }
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  
                </div>
              )}

          <hr className="bottom-space" />
        </div>
      </div>

      {/* Right: Request Summary */}
      <div className="srm-summary">
        <Card className="!rounded-none srm-summary-card">
          <CardContent className="!p-0 !pt-6 srm-summary-content">
            <div className="srm-summary-header">
            <h1>Current Ticket</h1>
                {/* Customer Info */}
                <div className="summary-grid rounded-xl">
                  <div className="summary-customer-info">
                    <p className="customer-name">{name || 'Customer Name'}</p>
                    <p className="customer-id">
                      {customerId === 'NEW' ? 'New Customer' : `#${customerId}`}
                    </p>
                  </div>
                  <div>
                    <i className="bi-chevron-right"></i>
                  </div>
              </div>
             </div>
            <hr className="section-divider" />
            <div className="srm-summary-body">
              

              {/* Services with actual prices */}
              <div className="summary-service-list">
                {shoes.map((shoe, i) => (
                <div className="summary-service-entry mb-5" key={i}>
                  <p className="font-medium shoe-name">
                    <span
                      className={`active-shoe-badge mr-1 ${
                        i === activeShoeIndex ? '' : 'is-inactive'
                      }`}
                    >
                      Shoe #{i + 1}
                    </span>
                    {shoe.model || 'Unnamed Shoe'}
                  </p>

                  <div
                    className={`summary-list ${
                      i === activeShoeIndex ? '' : 'is-inactive'
                    }`}
                  >
                    {shoe.services.map((srvId) => {
                      const svc = serviceById.get(srvId);
                      return (
                        <div key={srvId} className="pl-5 flex justify-between">
                          <div>
                            <p className="service-name">{svc ? svc.service_name : srvId}</p>
                            <p className="service-type">SERVICE</p>
                          </div>
                          <p className="text-right service-price">{formatCurrency(svc ? svc.service_base_price : 0)}</p>
                        </div>
                      );
                    })}

                    {Object.entries(shoe.additionals).map(([addId, qty]) => {
                      const addon = serviceById.get(addId);
                      return (
                        <div key={`${addId}-${i}`} className="pl-5 flex justify-between">
                          <div>
                            <p className="service-name">{addon ? addon.service_name : addId} {qty > 1 ? ` x${qty}` : ''}</p>
                            <p className="service-type">ADD ONS</p>
                          </div>
                          <p className="text-right service-price">{formatCurrency((addon ? addon.service_base_price : 0) * qty)}</p>
                        </div>
                      );
                    })}
                    
                    {shoe.rush === 'yes' && (
                      <div className="pl-5 flex justify-between text-red-600">
                        <p className="service-name">Rush Service</p>
                        <p className="text-right service-price">{formatCurrency(RUSH_FEE)}</p>
                      </div>
                    )}
                    </div>
                    <hr className="section-divider" />
                    {/* Per-shoe subtotal */}
                    <div className="flex justify-between mt-2">
                      <p className="text-[#797979]">Subtotal</p>
                      <p className="text-right bold">
                        {formatCurrency(perShoeTotals[i]?.shoeTotal || 0)}
                      </p>
                    </div>

                    {/* Per-shoe estimated completion date */}
                    <div className="flex justify-between mb-5">
                      <p className="text-[#797979]">Estimated Completion</p>
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
            </div>

            <div className="summary-footer">
              <div className="summary-balance-row">
                <p>Total Amount Due:</p>
                {/* Since Amount Due / Payments not implemented yet, show total sales as current balance */}
                <h2>{formatCurrency(amountDueNow)}</h2>
              </div>
                <Button
                  disabled={submitting}
                  className="w-full p-8 mt-4 rounded-xl button-lg bg-[#DC2626] hover:bg-[#9e1c1c]"
                  onClick={() => setIsCheckoutModalOpen(true)}
                >
                  Finalize Ticket
                  <i className="bi-arrow-right"></i>
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
        <DialogContent className="customer-modal-content" style={{ 
          width: 'fit-content !important', 
          maxWidth: '90vw !important',
          minWidth: '300px !important'
        }}>
          <DialogHeader className="modal-head-row">
            <div className="modal-head-icon customer">
              <UserRound className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle>New Customer</DialogTitle>
              <DialogDescription>
                Fill in customer details for this service request.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="customer-modal-grid">
            <div>
              <Label>Customer Name</Label>
              <Input
                value={customerDraft.name}
                onChange={(e: any) =>
                  setCustomerDraft((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter full name"
              />
            </div>

            <div>
              <Label>Phone Number</Label>
              <Input
                value={customerDraft.phone}
                onChange={(e: any) =>
                  setCustomerDraft((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="09XXXXXXXXX"
              />
            </div>

            <div>
              <Label>Email Address</Label>
              <Input
                value={customerDraft.email}
                onChange={(e: any) =>
                  setCustomerDraft((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="email@example.com"
              />
            </div>

            <div>
              <Label>Birthdate</Label>
              <Input
                type="date"
                value={customerDraft.birthdate}
                onChange={(e: any) =>
                  setCustomerDraft((prev) => ({ ...prev, birthdate: e.target.value }))
                }
              />
            </div>

            <div className="customer-modal-address">
              <Label>Address</Label>
              <Input
                value={customerDraft.address}
                onChange={(e: any) =>
                  setCustomerDraft((prev) => ({ ...prev, address: e.target.value }))
                }
                placeholder="Address"
              />
            </div>
          </div>

          <DialogFooter className="modal-actions">
            <Button type="button" variant="outline" className="modal-cancel" onClick={() => setIsCustomerModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="modal-confirm" onClick={saveCustomerFromModal}>
              Register Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCheckoutModalOpen} onOpenChange={setIsCheckoutModalOpen}>
        <DialogContent className="checkout-modal-content" style={{ 
          width: 'fit-content !important', 
          maxWidth: '90vw !important',
          minWidth: '300px !important'
        }}>
          <DialogHeader className="modal-head-row">
            <div className="modal-head-icon checkout">
              <ReceiptText className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle>Checkout Summary</DialogTitle>
              <DialogDescription>
                Review payment details and finalize this ticket.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="checkout-modal-body">
            <div className="checkout-discount-column">
              <div className="checkout-cashier-row">
                <Label>Cashier</Label>
                <Input value={cashier} readOnly placeholder="Cashier name" />
              </div>

              <div className="checkout-payment-mode">
                <Label>Mode of Payment</Label>
                <RadioGroup
                  value={modeOfPayment}
                  onValueChange={(val) => setModeOfPayment(val as 'cash' | 'gcash' | 'bank' | 'other')}
                  className="payment-radio-group"
                >
                  <div className="radio-option">
                    <RadioGroupItem value="cash" id="checkout-cash" />
                    <Label htmlFor="checkout-cash" className="radio-inline-label">Cash</Label>
                  </div>
                  <div className="radio-option">
                    <RadioGroupItem value="gcash" id="checkout-gcash" />
                    <Label htmlFor="checkout-gcash" className="radio-inline-label">GCash</Label>
                  </div>
                  <div className="radio-option">
                    <RadioGroupItem value="bank" id="checkout-bank" />
                    <Label htmlFor="checkout-bank" className="radio-inline-label">Bank</Label>
                  </div>
                  <div className="radio-option">
                    <RadioGroupItem value="other" id="checkout-other" />
                    <Label htmlFor="checkout-other" className="radio-inline-label">Other</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="checkbox-item">
                <Checkbox
                  checked={applyDiscount}
                  onCheckedChange={(checked) => setApplyDiscount(!!checked)}
                  id="checkout-apply-discount"
                />
                <Label htmlFor="checkout-apply-discount">Apply Discount</Label>
              </div>

              {applyDiscount && (
                <div className="checkout-discount-type">
                  <RadioGroup
                    value={discountType}
                    onValueChange={(val) => setDiscountType(val as 'percent' | 'fixed')}
                  >
                    <div className="radio-option">
                      <RadioGroupItem value="percent" id="checkout-percent" />
                      <Label htmlFor="checkout-percent">Percent Discount (%)</Label>
                    </div>
                    <div className="radio-option">
                      <RadioGroupItem value="fixed" id="checkout-fixed" />
                      <Label htmlFor="checkout-fixed">Fixed Amount Discount (₱)</Label>
                    </div>
                  </RadioGroup>
                  <Input
                    className="mt-3"
                    placeholder={discountType === 'percent' ? 'Enter %' : 'Enter amount'}
                    value={discountValue}
                    onChange={(e: any) => setDiscountValue(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="checkout-payment-column">
              <div className="payment-type-buttons">
                <Button
                  className="rounded-full payment-button"
                  variant={paymentType === 'full' ? 'selected' : 'unselected'}
                  onClick={() => setPaymentType('full')}
                >
                  Full Payment
                </Button>
                <Button
                  className="rounded-full payment-button"
                  variant={paymentType === 'half' ? 'selected' : 'unselected'}
                  onClick={() => setPaymentType('half')}
                >
                  50% Down
                </Button>
                <Button
                  className="rounded-full payment-button"
                  variant={paymentType === 'custom' ? 'selected' : 'unselected'}
                  onClick={() => setPaymentType('custom')}
                >
                  Custom
                </Button>
              </div>

              <div className="checkout-totals-grid">
                <p>Total Bill:</p>
                <p className="text-right">{formatCurrency(totalBill)}</p>

                <p>Total Sales:</p>
                <p className="text-right">{formatCurrency(totalSales)}</p>

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
                    if (amountDueNow > 0 && customerPaid < amountDueNow) {
                      toast.error('Amount paid cannot be lower than amount due now.')
                    }
                  }}
                />

                <p>Change:</p>
                <p className="text-right checkout-change-value">{formatCurrency(change)}</p>
                <div className="text-right checkout-change-value">
                  <p>Balance:</p>
                  {/* Since Amount Due / Payments not implemented yet, show total sales as current balance */}
                  <h2>{formatCurrency(balance)}</h2>
              </div>
              </div>

              <Button
                disabled={submitting}
                className="w-full mt-2 p-7 button-lg bg-[#DC2626] hover:bg-[#B91C1C]"
                onClick={handleConfirmServiceRequest}
              >
                {submitting ? 'Finalizing...' : 'Complete Order & Print Receipt'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
