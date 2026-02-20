import { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import type { RunRecord } from "../runs/types";
import PageHeader from "../components/PageHeader";
import { getRunById } from "../runs/store";

export interface RunDetailsPageProps {
  runId: string;
  onBack: () => void;
}

/** Single-run summary view. */
export default function RunDetailsPage({ runId, onBack }: RunDetailsPageProps) {
  const [run, setRun] = useState<RunRecord | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    getRunById(runId)
      .then((r) => {
        if (!cancelled) setRun(r ?? null);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load run");
          setRun(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  if (error) {
    return (
      <>
        <PageHeader
          title="Error"
          subtitle={error}
          actions={
            <Button onClick={onBack} variant="outlined">
              Back to Runs
            </Button>
          }
        />
      </>
    );
  }

  if (run === undefined) {
    return (
      <PageHeader
        title="Run Details"
        subtitle="Loading…"
        actions={
          <Button onClick={onBack} variant="outlined">
            Back to Runs
          </Button>
        }
      />
    );
  }

  if (!run) {
    return (
      <PageHeader
        title="Run not found"
        subtitle={`No run with id "${runId}".`}
        actions={
          <Button onClick={onBack} variant="outlined">
            Back to Runs
          </Button>
        }
      />
    );
  }

  const createdFormatted = new Date(run.createdAt).toLocaleString();

  return (
    <>
      <PageHeader
        title="Run Details"
        subtitle={`${run.moduleName} • ${run.orgLabel}`}
        actions={
          <Button onClick={onBack} variant="outlined">
            Back to Runs
          </Button>
        }
      />
      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Summary
          </Typography>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Stack spacing={1}>
                <SummaryRow label="Run ID" value={run.id} />
                <SummaryRow label="Created At" value={createdFormatted} />
                <SummaryRow label="Module" value={run.moduleName} />
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Stack spacing={1}>
                <SummaryRow label="Org" value={run.orgLabel} />
                <SummaryRow label="Status" value={run.status} />
                {run.notes != null && run.notes !== "" && (
                  <SummaryRow label="Notes" value={run.notes} />
                )}
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 88 }}>
        {label}:
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );
}
