import { ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChatPanel } from '../components/ChatPanel'
import { QuickProductSearch } from '../components/QuickProductSearch'

const adminSuggestions = [
  '¿Cuánto vendimos esta semana?',
  '¿Cuáles son los cinco productos más vendidos este mes?',
  '¿Qué productos necesitamos reponer?',
  '¿Qué clientes compran con mayor frecuencia?',
  'Resume el comportamiento de las ventas de este mes.',
  'Compara las ventas de este mes con el mes pasado.',
  '¿Qué lotes vencen en los próximos 30 días?',
  '¿Qué productos tienen poca rotación?',
]

const productSuggestions = ['¿Tenemos Omega 3 disponible?', '¿Qué productos están agotados?', '¿Qué categorías de productos tenemos?', '¿Cuál es el precio de la maca?']

export function AssistantPage() {
  return (
    <>
      <PageHeader title="VIDALID AI" description="Asistentes que consultan la información real de la empresa." />

      <Tabs defaultValue="admin">
        <TabsList className="mb-4">
          <TabsTrigger value="admin">Asistente administrativo</TabsTrigger>
          <TabsTrigger value="products">Consulta de productos</TabsTrigger>
        </TabsList>

        <TabsContent value="admin">
          <ChatPanel
            agent="admin"
            title="Asistente administrativo"
            description="Ventas, productos, clientes, inventario y recomendaciones."
            suggestions={adminSuggestions}
          />
        </TabsContent>

        <TabsContent value="products">
          <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
            <QuickProductSearch />
            <ChatPanel
              agent="products"
              title="Asistente de productos"
              description="Existencia, disponibilidad, precios y categorías."
              suggestions={productSuggestions}
            />
          </div>
        </TabsContent>
      </Tabs>

      <p className="mt-4 flex items-start gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
        El asistente solo lee datos mediante consultas autorizadas: no puede modificar inventario, precios ni ventas. Verifica las cifras importantes antes de tomar decisiones.
      </p>
    </>
  )
}
