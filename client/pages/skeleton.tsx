import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Skeleton className="h-10 w-[250px]" />
          <Skeleton className="h-6 w-[350px] mt-2" />
        </div>
        <Skeleton className="h-10 w-[240px]" /> {/* Date range picker */}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium"><Skeleton className="h-4 w-20" /></CardTitle>
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-1/2 mt-1" />
              <Skeleton className="h-3 w-1/3 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Batches */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle><Skeleton className="h-6 w-40" /></CardTitle>
                <div className="text-sm text-muted-foreground"><Skeleton className="h-4 w-60 mt-1" /></div>
              </div>
              <Skeleton className="h-9 w-24" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24 mt-1" /></div>
                  </div>
                  <div className="text-right space-y-1"><Skeleton className="h-5 w-16" /><Skeleton className="h-3 w-20 mt-1" /></div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Batch Status Donut Chart */}
          <Card>
            <CardHeader>
              <CardTitle><Skeleton className="h-6 w-52" /></CardTitle>
              <div className="text-sm text-muted-foreground"><Skeleton className="h-4 w-72 mt-1" /></div>
            </CardHeader>
            <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
          </Card>

          {/* Tabs Section */}
          <Tabs defaultValue="schedule" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <Skeleton className="h-9 w-1/2" />
              <Skeleton className="h-9 w-1/2" />
            </TabsList>
            <TabsContent value="schedule">
              <Card>
                <CardHeader>
                  <CardTitle><Skeleton className="h-6 w-48" /></CardTitle>
                  <div className="text-sm text-muted-foreground"><Skeleton className="h-4 w-60 mt-1" /></div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-32 mt-1" /></div>
                      <div className="text-right"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-20 mt-1" /></div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle><Skeleton className="h-6 w-32" /></CardTitle>
              <div className="text-sm text-muted-foreground"><Skeleton className="h-4 w-40 mt-1" /></div>
            </CardHeader>
            <CardContent className="grid gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>

          {/* Faculty Utilization */}
          <Card>
            <CardHeader>
              <CardTitle><Skeleton className="h-6 w-48" /></CardTitle>
              <div className="text-sm text-muted-foreground"><Skeleton className="h-4 w-60 mt-1" /></div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>{Array.from({ length: 4 }).map((_, i) => (<TableHead key={i}><Skeleton className="h-4 w-16" /></TableHead>))}</TableRow></TableHeader>
                <TableBody>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}