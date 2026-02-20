import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { RunRecord } from "../runs/types";

export interface ModuleRunFormProps {
  startRun: (payload: { orgLabel: string; notes?: string }) => Promise<RunRecord>;
  onRunQueued: (run: RunRecord) => void;
}

/** Shared run form: org label, notes, Start Run; calls startRun then onRunQueued (toast/nav owned by shell). */
export default function ModuleRunForm({ startRun, onRunQueued }: ModuleRunFormProps) {
  const [orgLabel, setOrgLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleStartRun = async () => {
    if (!orgLabel.trim()) return;
    setSubmitting(true);
    try {
      const run = await startRun({ orgLabel: orgLabel.trim(), notes: notes.trim() || undefined });
      onRunQueued(run);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Run
        </Typography>
        <Stack spacing={2} sx={{ maxWidth: 480 }}>
          <TextField
            label="Target Org Label"
            placeholder="Prod, UAT, etc."
            value={orgLabel}
            onChange={(e) => setOrgLabel(e.target.value)}
            size="small"
            fullWidth
          />
          <TextField
            label="Notes (optional)"
            placeholder="Optional notes for this run"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            minRows={2}
            size="small"
            fullWidth
          />
          <Box>
            <Button
              variant="contained"
              onClick={handleStartRun}
              disabled={!orgLabel.trim() || submitting}
            >
              Start Run
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
