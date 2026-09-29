import React, { useState, useEffect } from 'react';
import '../styles.css';
import { GroqPluginInterface } from '../types/plugin';
import { GroqModelInfo } from '../settings/GroqChatSettings';
import { toast } from 'react-toastify';
import { t, Locale } from '../localization';
import { groupModelsByOwner, isPreviewModel } from '../utils/modelUtils';

interface GroupedModelSelectorProps {
  plugin: GroqPluginInterface;
  selectedModel: string;
  onSelectModel: (_modelId: string) => void;
  getAvailableModels: () => Promise<GroqModelInfo[]>;
  availableModels?: GroqModelInfo[];
  locale?: Locale;
}

export const GroupedModelSelector: React.FC<GroupedModelSelectorProps> = ({
  plugin: _plugin,
  selectedModel,
  onSelectModel,
  getAvailableModels,
  availableModels: availableModelsProp,
  locale = 'en',
}) => {
  const [availableModels, setAvailableModels] = useState<GroqModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (availableModelsProp) {
      setIsLoading(false);
      setAvailableModels(availableModelsProp);
      return;
    }
    const fetchAvailableModels = async () => {
      setIsLoading(true);
      try {
        const models = await getAvailableModels();
        // Фильтруем только активные
        const activeModels = Array.isArray(_plugin.settings.groqAvailableModels)
          ? models.filter(m =>
              _plugin.settings.groqAvailableModels?.find(
                s => s.id === m.id && s.isActive !== false,
              ),
            )
          : models;
        setAvailableModels(activeModels.map((m: GroqModelInfo) => ({ ...m })));
      } catch (error) {
        console.error('Failed to fetch available models:', error);
        setAvailableModels([]);
        toast.error(t('modelsUpdateError', locale));
      } finally {
        setIsLoading(false);
      }
    };

    void fetchAvailableModels();
  }, [getAvailableModels, _plugin.settings.groqAvailableModels, availableModelsProp]);

  if (isLoading) {
    return <div className="groq-model-selector">{t('loadingModels', locale)}</div>;
  }

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;
    onSelectModel(selectedValue);
  };

  // Группируем модели: сначала по провайдеру верхнего уровня (Groq / OpenRouter),
  // затем — как и раньше — по владельцу (developer) внутри каждой группы провайдера.
  // Нативный <select> не поддерживает вложенные <optgroup>, поэтому подгруппы
  // владельцев рендерятся как отдельные optgroup с составной подписью
  // "Provider · Owner", что визуально сохраняет иерархию провайдер → владелец.
  const providerOrder: Array<{ id: 'groq' | 'openrouter'; label: string }> = [
    { id: 'groq', label: 'Groq' },
    { id: 'openrouter', label: 'OpenRouter' },
  ];

  const providerGroups = providerOrder
    .map(({ id, label }) => {
      const modelsForProvider = availableModels.filter(m => (m.provider ?? 'groq') === id);
      if (modelsForProvider.length === 0) return null;
      const groupedByOwner = groupModelsByOwner(modelsForProvider);
      const sortedOwnerGroups = Object.entries(groupedByOwner).sort(([ownerA], [ownerB]) =>
        ownerA.localeCompare(ownerB, locale === 'ru' ? 'ru' : 'en'),
      );
      return { providerId: id, providerLabel: label, ownerGroups: sortedOwnerGroups };
    })
    .filter((group): group is NonNullable<typeof group> => group !== null);

  return (
    <div className="groq-model-selector">
      <select
        id="model-select"
        value={selectedModel}
        onChange={handleChange}
        className="groq-select"
        aria-label={t('chooseModel', locale)}
      >
        {providerGroups.map(({ providerId, providerLabel, ownerGroups }) =>
          ownerGroups.map(([owner, models]) => (
            <optgroup key={`${providerId}-${owner}`} label={`${providerLabel} · ${owner}`}>
              {models.map(modelInfo => {
                const displayName =
                  modelInfo.name + (isPreviewModel(modelInfo) ? ` (${t('preview', locale)})` : '');
                return (
                  <option key={modelInfo.id} value={modelInfo.id}>
                    {displayName}
                  </option>
                );
              })}
            </optgroup>
          )),
        )}
      </select>
    </div>
  );
};
