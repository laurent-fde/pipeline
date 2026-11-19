// Page provisoire : vitrine du design system (thème C · Outil).
// Elle sera remplacée par le premier lot.

import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { ThemeToggle } from "@/presentation/components/theme-toggle";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Pipeline</h1>
          <p className="mt-1 text-muted-foreground">Design system · thème C · Outil</p>
        </div>
        <ThemeToggle />
      </header>

      <section className="flex flex-wrap gap-2">
        <Button>Ajouter un contact</Button>
        <Button variant="secondary">Annuler</Button>
        <Button variant="ghost">Plus</Button>
        <Button variant="destructive">Supprimer</Button>
      </section>

      <section className="grid gap-4 sm:max-w-sm">
        <div className="grid gap-2">
          <Label htmlFor="name">Nom</Label>
          <Input id="name" defaultValue="Claire Martin" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="company">Entreprise</Label>
          <Input id="company" placeholder="Entreprise" aria-invalid />
          <p className="text-xs text-destructive">Ce champ est obligatoire.</p>
        </div>
      </section>

      <Card className="sm:max-w-sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                CM
              </div>
              <div>
                <CardTitle>Claire Martin</CardTitle>
                <p className="text-sm text-muted-foreground">Atelier Lumen</p>
              </div>
            </div>
            <Badge className="bg-info text-info-foreground">RDV</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="rounded-md bg-warning px-3 py-2 text-sm text-warning-foreground">⏰ À relancer aujourd&apos;hui</p>
          <div className="flex gap-2">
            <Button size="sm">Étape suivante</Button>
            <Button size="sm" variant="secondary">Modifier</Button>
          </div>
        </CardContent>
      </Card>

      <p className="font-mono text-xs text-muted-foreground">relance: 2026-11-19</p>
    </main>
  );
}
