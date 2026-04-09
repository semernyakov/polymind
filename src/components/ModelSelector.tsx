import React, { useState, useEffect } from 'react';
import '../styles.css'; // Используем единый style.css
import { GroqPluginInterface } from '../types/plugin';
import { GroqModelInfo } from '../settings/GroqChatSettings';
import { toast } from 'react-toastify'; // Импортируем toast
import { t, Locale } from '../localization';
import { fixModelNameCasing, groupModelsByOwner, isPreviewModel } from '../utils/modelUtils';

export interface ModelSelectorProps {
  plugin: GroqPluginInterface;
  selectedModel: string;
  onSelectModel: (_modelId: string) => void;
  getAvailableModels: () => Promise<GroqModelInfo[]>;
  availableModels?: GroqModelInfo[];
  locale?: Locale;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  plugin: _plugin,
  selectedModel,
  onSelectModel,
  getAvailableModels,
  availableModels: availableModelsProp,
  locale = 'en',
}) => {
  // Если availableModels передан как проп, используем его, иначе локальный state
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
        toast.error(t('modelsUpdateError', locale)); // Добавляем toast
      } finally {
        setIsLoading(false);
      }
    };

    void fetchAvailableModels();
  }, [getAvailableModels, _plugin.settings.groqAvailableModels, availableModelsProp]); // Добавляем зависимость

  if (isLoading) {
    return <div className="groq-model-selector">{t('loadingModels', locale)}</div>;
  }

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;
    onSelectModel(selectedValue);
  };

  return (
    <div className="groq-model-selector">
      {/* Скрываем label визуально, но оставляем для доступности */}
      {/*<label htmlFor="model-select" className="groq-visually-hidden"></label>*/}
      <select
        id="model-select"
        value={selectedModel}
        onChange={handleChange}
        className="groq-select"
        aria-label={t('chooseModel', locale)}
      >
        {(() => {
          // Группируем модели по владельцам
          const groupedModels = groupModelsByOwner(availableModels);

          // Создаем массив опций для select
          const options = [];

          // Добавляем опцию по умолчанию
          options.push(
            <option key="" value="">
              {locale === 'ru' ? 'Выберите модель' : 'Select a model'}
            </option>,
          );

          // Сортируем группы по алфавиту и добавляем сгруппированные модели
          const sortedGroups = Object.entries(groupedModels).sort(([ownerA], [ownerB]) =>
            ownerA.localeCompare(ownerB, locale === 'ru' ? 'ru' : 'en'),
          );

          sortedGroups.forEach(([owner, models]) => {
            // Создаем optgroup для каждого владельца
            const optgroup = (
              <optgroup key={owner} label={owner}>
                {models.map(modelInfo => {
                  // Формируем отображаемое имя с учетом preview статуса
                  const displayName =
                    fixModelNameCasing(modelInfo.name) +
                    (isPreviewModel(modelInfo) ? ` (${t('preview', locale)})` : '');

                  return (
                    <option key={modelInfo.id} value={modelInfo.id}>
                      {displayName}
                    </option>
                  );
                })}
              </optgroup>
            );

            options.push(optgroup);
          });

          return options;
        })()}
      </select>
    </div>
  );
};
