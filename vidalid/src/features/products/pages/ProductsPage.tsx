import { PageHeader } from '@/components/shared/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CategoriesTab } from '../components/CategoriesTab'
import { ProductsTab } from '../components/ProductsTab'

export function ProductsPage() {
  return (
    <>
      <PageHeader title="Productos" description="Catálogo de productos, precios, stock mínimo y categorías." />
      <Tabs defaultValue="products">
        <TabsList className="mb-4">
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
        </TabsList>
        <TabsContent value="products">
          <ProductsTab />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>
      </Tabs>
    </>
  )
}
