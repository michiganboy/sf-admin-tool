import { useState, useMemo } from "react";
import {
  Autocomplete,
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  Tooltip,
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import PageHeader from "../components/PageHeader";
import { useFavorites } from "../hooks/useFavorites";
import { useModuleOverrides } from "../hooks/useModuleOverrides";
import { getEffectiveModuleMeta } from "../moduleEngine/getEffectiveModuleMeta";
import { useAllModules } from "../moduleEngine/useAllModules";
import { getEnabledIds } from "../moduleEngine/moduleEnablement";
import {
  getModulesViewModel,
  getVisibleTagsAndOverflow,
} from "./modules/modulesViewModel";

export interface ModulesPageProps {
  onSelectModule: (moduleId: string) => void;
}

/** Modules list with search, tag filter, favorites, and category grouping. Uses effective meta (defaults + overrides). */
export default function ModulesPage({ onSelectModule }: ModulesPageProps) {
  const { modules: allModules, loading } = useAllModules();
  const { overrides } = useModuleOverrides();
  const { favoritesSet, toggleFavorite } = useFavorites();
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const enabledModules = useMemo(() => {
    const enabledIds = getEnabledIds();
    if (enabledIds === null) return allModules;
    const enabledSet = new Set(enabledIds);
    return allModules.filter((mod) => enabledSet.has(mod.id));
  }, [allModules]);

  const modulesWithMeta = useMemo(
    () =>
      enabledModules.map((mod) => {
        const { effectiveCategory, effectiveTags } = getEffectiveModuleMeta(
          mod,
          overrides
        );
        return { ...mod, effectiveCategory, effectiveTags };
      }),
    [enabledModules, overrides]
  );

  const { groups, availableTags, counts } = useMemo(
    () =>
      getModulesViewModel(modulesWithMeta, search, selectedTags, favoritesSet),
    [modulesWithMeta, search, selectedTags, favoritesSet]
  );

  return (
    <>
      <PageHeader
        title="Modules"
        subtitle="Select a module to view details and available actions."
      />
      <Stack spacing={2} sx={{ mt: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
          <TextField
            label="Search modules"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            fullWidth
            slotProps={{
              input: {
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setSearch("")}
                      aria-label="Clear search"
                      size="small"
                      edge="end"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
          <Autocomplete
            multiple
            size="small"
            options={availableTags}
            value={selectedTags}
            onChange={(_, next) => setSelectedTags(next)}
            renderInput={(params) => (
              <TextField {...params} label="Filter by tags" placeholder="Tags" />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option}
                  size="small"
                  {...getTagProps({ index })}
                />
              ))
            }
            sx={{ minWidth: 240 }}
          />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Showing {counts.filteredCount} of {counts.totalCount} modules
        </Typography>
        {loading ? (
          <Typography variant="body2" color="text.secondary">
            Loading modules...
          </Typography>
        ) : counts.filteredCount === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No modules match your search.
          </Typography>
        ) : (
          <Stack spacing={3}>
            {groups.map(({ categoryName, modules: categoryModules }) => (
              <Box key={categoryName}>
                <Typography
                  variant="subtitle1"
                  component="h2"
                  color="text.secondary"
                  sx={{ mb: 1.5, fontWeight: 600 }}
                >
                  {categoryName}
                </Typography>
                <Stack spacing={2}>
                  {categoryModules.map((mod) => {
                    const isFavorite = favoritesSet.has(mod.id);
                    const {
                      visible: visibleTags,
                      overflow,
                      overflowLabels,
                    } = getVisibleTagsAndOverflow(mod.effectiveTags);
                    return (
                      <Card
                        key={mod.id}
                        variant="outlined"
                        sx={{
                          cursor: "pointer",
                          "&:hover": {
                            backgroundColor: "action.hover",
                          },
                        }}
                        onClick={() => onSelectModule(mod.id)}
                      >
                        <CardContent sx={{ "&:last-child": { pb: 2 } }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: 1,
                            }}
                          >
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="h6" component="h3" gutterBottom>
                                {mod.name}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mb: 1.5 }}
                              >
                                {mod.description}
                              </Typography>
                              <Box
                                sx={{
                                  display: "flex",
                                  gap: 0.5,
                                  flexWrap: "wrap",
                                  alignItems: "center",
                                }}
                              >
                                {visibleTags.map((tag) => (
                                  <Chip
                                    key={tag}
                                    label={tag}
                                    size="small"
                                    variant="outlined"
                                  />
                                ))}
                                {overflow > 0 && (
                                  <Tooltip
                                    title={overflowLabels.join(", ")}
                                    describeChild
                                  >
                                    <Chip
                                      label={`+${overflow}`}
                                      size="small"
                                      variant="outlined"
                                    />
                                  </Tooltip>
                                )}
                              </Box>
                            </Box>
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(mod.id);
                              }}
                              aria-label={
                                isFavorite
                                  ? "Remove from favorites"
                                  : "Add to favorites"
                              }
                              size="small"
                              color={isFavorite ? "primary" : "default"}
                            >
                              {isFavorite ? (
                                <StarIcon fontSize="small" />
                              ) : (
                                <StarBorderIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Box>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Stack>
    </>
  );
}
