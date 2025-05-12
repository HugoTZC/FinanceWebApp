"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { CreditCard } from "lucide-react"
import { creditAPI } from "@/lib/api"
import { AddCreditDialog } from "@/components/credit/add-credit-dialog"
import { CreditCardSpending } from "@/components/credit/credit-card-spending"

interface CreditCardType {
  id: string
  name: string
  lastFour: string
  balance: number
  limit: number
  dueDate: string
  minPayment: number
  interestRate: number
}

interface Loan {
  id: string
  name: string
  balance: number
  originalAmount: number
  interestRate: number
  monthlyPayment: number
  dueDate: string
  term: string
  bankNumber: string
}

// Mock data for development
const creditCards: CreditCardType[] = [
  {
    id: "cc1",
    name: "Chase Sapphire",
    lastFour: "4567",
    balance: 2500,
    limit: 10000,
    dueDate: "2023-07-15",
    minPayment: 75,
    interestRate: 18.99,
  },
  {
    id: "cc2",
    name: "American Express",
    lastFour: "7890",
    balance: 1200,
    limit: 5000,
    dueDate: "2023-07-20",
    minPayment: 35,
    interestRate: 15.99,
  },
  {
    id: "cc3",
    name: "Discover",
    lastFour: "1234",
    balance: 800,
    limit: 3000,
    dueDate: "2023-07-05",
    minPayment: 25,
    interestRate: 16.99,
  },
]

const loans: Loan[] = [
  {
    id: "l1",
    name: "Auto Loan",
    balance: 15000,
    originalAmount: 25000,
    interestRate: 4.5,
    monthlyPayment: 450,
    dueDate: "2023-07-10",
    term: "5 years",
    bankNumber: "123456789",
  },
  {
    id: "l2",
    name: "Student Loan",
    balance: 22000,
    originalAmount: 30000,
    interestRate: 5.25,
    monthlyPayment: 350,
    dueDate: "2023-07-15",
    term: "10 years",
    bankNumber: "987654321",
  },
  {
    id: "l3",
    name: "Personal Loan",
    balance: 5000,
    originalAmount: 8000,
    interestRate: 7.99,
    monthlyPayment: 250,
    dueDate: "2023-07-20",
    term: "3 years",
    bankNumber: "456789123",
  },
]

export function CreditCards() {
  const [activeTab, setActiveTab] = useState("cards")
  const [apiCreditCards, setApiCreditCards] = useState<CreditCardType[]>([])
  const [apiLoans, setApiLoans] = useState<Loan[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Fetch credit cards from API
  async function fetchCreditCards() {
    try {
      setIsLoading(true)
      console.log('🔍 Fetching credit cards...')
      const response = await creditAPI.getCards()
      console.log('📊 Got response:', response)
      
      // Transform the data to match our frontend types
      interface APICardData {
        id?: string;
        name?: string;
        last_four?: string;
        balance?: string | number;
        credit_limit?: string | number;
        due_date?: string;
        min_payment?: string | number;
        interest_rate?: string | number;
      }

      interface APIResponse {
        data?: {
          data?: {
        cards?: APICardData[];
          };
        };
      }

      const transformedCards: CreditCardType[] = (response?.data?.data?.cards || []).map((card: APICardData) => ({
        id: card.id || '',
        name: card.name || '',
        lastFour: card.last_four || '',
        balance: typeof card.balance === 'string' ? parseFloat(card.balance) : (typeof card.balance === 'number' ? card.balance : 0),
        limit: typeof card.credit_limit === 'string' ? parseFloat(card.credit_limit) : (typeof card.credit_limit === 'number' ? card.credit_limit : 0),
        dueDate: card.due_date || new Date().toISOString(),
        minPayment: typeof card.min_payment === 'string' ? parseFloat(card.min_payment) : (typeof card.min_payment === 'number' ? card.min_payment : 0),
        interestRate: typeof card.interest_rate === 'string' ? parseFloat(card.interest_rate) : (typeof card.interest_rate === 'number' ? card.interest_rate : 0)
      }))
      
      setApiCreditCards(transformedCards)
      console.log('💳 Updated cards state:', transformedCards)
    } catch (error) {
      console.error("❌ Failed to fetch credit cards:", error)
      setApiCreditCards([])
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch loans from API
  async function fetchLoans() {
    try {
      setIsLoading(true)
      console.log('🔍 Fetching loans...')
      const response = await creditAPI.getLoans()
      console.log('📊 Got loans response:', response)
      
      // Transform the data to match our frontend types
      const transformedLoans = (response?.data?.data?.loans || []).map((loan: any) => ({
        id: loan.id || '',
        name: loan.name || '',
        balance: typeof loan.balance === 'string' ? parseFloat(loan.balance) : (typeof loan.balance === 'number' ? loan.balance : 0),
        originalAmount: typeof loan.original_amount === 'string' ? parseFloat(loan.original_amount) : (typeof loan.original_amount === 'number' ? loan.original_amount : 0),
        interestRate: typeof loan.interest_rate === 'string' ? parseFloat(loan.interest_rate) : (typeof loan.interest_rate === 'number' ? loan.interest_rate : 0),
        monthlyPayment: typeof loan.monthly_payment === 'string' ? parseFloat(loan.monthly_payment) : (typeof loan.monthly_payment === 'number' ? loan.monthly_payment : 0),
        dueDate: loan.due_date || new Date().toISOString(),
        term: loan.term || '',
        bankNumber: loan.bank_number || ''
      }))
      
      setApiLoans(transformedLoans)
      console.log('💰 Updated loans state:', transformedLoans)
    } catch (error) {
      console.error("❌ Failed to fetch loans:", error)
      setApiLoans([])
    } finally {
      setIsLoading(false)
    }
  }

  // Function to refresh data when a new card/loan is added
  const handleAddSuccess = () => {
    if (activeTab === "cards") {
      fetchCreditCards()
    } else {
      fetchLoans()
    }
  }

  // Initial data fetch
  useEffect(() => {
    if (activeTab === "cards") {
      fetchCreditCards()
    } else {
      fetchLoans()
    }
  }, [activeTab])

  // Function to handle card deletion
  async function handleDeleteCard(id: string) {
    if (confirm("Are you sure you want to delete this credit card?")) {
      try {
        await creditAPI.deleteCard(id)
        // Refresh the list
        fetchCreditCards()
      } catch (error) {
        console.error("Failed to delete credit card:", error)
        alert("Failed to delete credit card. Please try again.")
      }
    }
  }

  // Function to handle loan deletion
  async function handleDeleteLoan(id: string) {
    if (confirm("Are you sure you want to delete this loan?")) {
      try {
        await creditAPI.deleteLoan(id)
        // Refresh the list
        fetchLoans()
      } catch (error) {
        console.error("Failed to delete loan:", error)
        alert("Failed to delete loan. Please try again.")
      }
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="cards" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cards">Credit Cards</TabsTrigger>
          <TabsTrigger value="loans">Loans</TabsTrigger>
          <TabsTrigger value="spending">Card Spending</TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="space-y-4">
          {isLoading && (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {!isLoading && apiCreditCards.length === 0 ? (
              <div className="md:col-span-2 text-center p-8 border rounded-lg border-dashed">
                <CreditCard className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Credit Cards Added</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You haven't added any credit cards yet. Add your first credit card to start tracking.
                </p>
              </div>
            ) : (
              apiCreditCards.map((card) => {
                const utilizationPercent = Math.round((card.balance / card.limit) * 100)
                const dueDate = new Date(card.dueDate).toLocaleDateString()
                
                return (
                  <Card key={card.id} className="border border-border dark:border-opacity-70">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          <CardTitle className="text-sm font-medium">{card.name}</CardTitle>
                        </div>
                        <CardDescription>**** {card.lastFour}</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Balance</span>
                          <span className="text-sm font-medium">
                            ${card.balance.toFixed(2)} / ${card.limit.toFixed(2)}
                          </span>
                        </div>
                        <Progress value={utilizationPercent} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{utilizationPercent}% utilization</span>
                          <span>${(card.limit - card.balance).toFixed(2)} available</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <div className="text-muted-foreground">Due Date</div>
                          <div>{dueDate}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Min Payment</div>
                          <div>${card.minPayment.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Interest Rate</div>
                          <div>{card.interestRate}%</div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Handle edit functionality
                          }}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteCard(card.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          <AddCreditDialog onSuccess={handleAddSuccess} />
        </TabsContent>

        <TabsContent value="loans" className="space-y-4">
          {isLoading && (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {!isLoading && apiLoans.length === 0 ? (
              <div className="md:col-span-2 text-center p-8 border rounded-lg border-dashed">
                <CreditCard className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Loans Added</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You haven't added any loans yet. Add your first loan to start tracking.
                </p>
              </div>
            ) : (
              apiLoans.map((loan) => {
                const paidPercent = Math.round(((loan.originalAmount - loan.balance) / loan.originalAmount) * 100)
                const dueDate = new Date(loan.dueDate).toLocaleDateString()

                return (
                  <Card key={loan.id} className="border border-border dark:border-opacity-70">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-medium">{loan.name}</CardTitle>
                        <CardDescription>#{loan.bankNumber.slice(-4)}</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Paid Off</span>
                          <span className="text-sm font-medium">
                            ${(loan.originalAmount - loan.balance).toFixed(2)} / ${loan.originalAmount.toFixed(2)}
                          </span>
                        </div>
                        <Progress value={paidPercent} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{paidPercent}% paid</span>
                          <span>${loan.balance.toFixed(2)} remaining</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <div className="text-muted-foreground">Due Date</div>
                          <div>{dueDate}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Monthly Payment</div>
                          <div>${loan.monthlyPayment.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Interest Rate</div>
                          <div>{loan.interestRate}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Term</div>
                          <div>{loan.term}</div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Handle edit functionality
                          }}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteLoan(loan.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          <AddCreditDialog onSuccess={handleAddSuccess} />
        </TabsContent>

        <TabsContent value="spending" className="space-y-4">
          <CreditCardSpending />
        </TabsContent>
      </Tabs>
    </div>
  )
}

