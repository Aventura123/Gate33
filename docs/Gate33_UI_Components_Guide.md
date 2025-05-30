# Gate33 UI Components Guide

Este guia contém todos os padrões de estilo e componentes utilizados no projeto Gate33. Utilize-o como referência para adaptar componentes existentes ou criar novos componentes que sigam a identidade visual do projeto.

## Índice
- [Componentes](#componentes)
  - [Card (Cartões)](#card-cartões)
  - [Elementos de Formulário](#elementos-de-formulário)
  - [Botões](#botões)
  - [Mensagens de Feedback](#mensagens-de-feedback)
  - [Componentes Expansíveis](#componentes-expansíveis)
  - [Badges de Status](#badges-de-status)
  - [Layout](#layout)
- [Guia de Estilos](#guia-de-estilos)
  - [Cores](#cores)
  - [Tipografia](#tipografia)
  - [Espaçamento](#espaçamento)
  - [Bordas e Cantos](#bordas-e-cantos)
- [Prompt para Adaptação de Componentes](#prompt-para-adaptação-de-componentes)

## Componentes

### Card (Cartões)

#### Cartão Principal
```tsx
<div className="bg-black/30 p-4 md:p-6 rounded-xl mb-6 md:mb-10 border border-gray-700 hover:border-orange-500 transition-colors">
  {/* Conteúdo do cartão */}
</div>
```

#### Cartão Destacado (para seções importantes)
```tsx
<div className="bg-black/70 border border-orange-700 rounded-xl p-4 md:p-6 mb-6 backdrop-blur-sm">
  {/* Conteúdo do cartão */}
</div>
```

#### Cartão de Item em Lista
```tsx
<div className="bg-black/30 border border-gray-700 hover:border-orange-500 rounded-xl overflow-hidden transition-colors">
  {/* Conteúdo do cartão */}
</div>
```

#### Título de Seção (para usar dentro de cartões)
```tsx
<h3 className="text-lg md:text-xl font-bold text-orange-400 mb-4">
  Título da Seção
</h3>
```

### Elementos de Formulário

#### Input Text/Email/URL/Number
```tsx
<div>
  <label htmlFor="campo" className="block text-sm font-semibold text-gray-300 mb-1">
    Label do Campo
  </label>
  <input
    id="campo"
    name="campo"
    type="text" // ou "email", "url", "number", etc.
    value={valor}
    onChange={handleChange}
    className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-400 focus:outline-none text-sm"
    required
  />
  <p className="text-xs text-gray-400 mt-1">Texto de ajuda (opcional)</p>
</div>
```

#### Input File
```tsx
<div>
  <label htmlFor="fileInput" className="block text-sm font-semibold text-gray-300 mb-1">
    Imagem
  </label>
  <input
    id="fileInput"
    type="file"
    accept="image/*"
    onChange={handleFileChange}
    className="w-full px-3 py-2 bg-black/40 border border-gray-600 rounded-lg text-white file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-orange-500 file:text-white file:text-sm hover:file:bg-orange-600"
  />
  <p className="text-xs text-gray-400 mt-1">Texto de ajuda sobre o arquivo</p>
</div>
```

#### Checkbox
```tsx
<div className="flex items-center">
  <label className="flex items-center cursor-pointer">
    <input
      type="checkbox"
      name="nomeDoCampo"
      checked={valorBooleano}
      onChange={handleChange}
      className="mr-2 h-5 w-5 accent-orange-500"
    />
    <span className="text-gray-300 text-sm font-medium">Texto do Checkbox</span>
  </label>
</div>
```

### Botões

#### Botão Principal (CTA)
```tsx
<button
  type="submit" // ou "button"
  onClick={handleClick}
  disabled={loading}
  className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-60 font-semibold shadow text-sm w-full md:w-auto"
>
  Texto do Botão
</button>
```

#### Botão Secundário
```tsx
<button
  type="button"
  onClick={handleClick}
  className="bg-gray-800 hover:bg-gray-700 text-gray-100 px-3 py-1.5 rounded-md text-xs font-semibold"
>
  Texto do Botão
</button>
```

#### Botão de Ação Negativa (Delete/Cancel)
```tsx
<button
  type="button"
  onClick={handleDelete}
  className="bg-red-600 hover:bg-red-700 text-white px-2 md:px-3 py-1.5 rounded-md text-xs font-semibold"
>
  Excluir
</button>
```

### Mensagens de Feedback

#### Mensagem de Erro
```tsx
<div className="bg-red-900/50 border border-red-500 text-white p-3 md:p-4 rounded-lg mb-4 md:mb-6 text-sm">
  Mensagem de erro aqui
</div>
```

#### Mensagem de Sucesso
```tsx
<div className="bg-green-900/50 border border-green-500 text-white p-3 md:p-4 rounded-lg mb-4 md:mb-6 text-sm">
  Mensagem de sucesso aqui
</div>
```

### Componentes Expansíveis

#### Cabeçalho Expansível
```tsx
<div 
  className="flex justify-between items-center p-3 cursor-pointer"
  onClick={toggleExpand}
>
  <div className="flex items-center space-x-2">
    {isExpanded ? (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
      </svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    )}
    <h4 className="text-sm md:text-base font-bold text-orange-400">Título do Item</h4>
  </div>
  {/* Badge de status opcional */}
</div>
```

#### Conteúdo Expansível
```tsx
{isExpanded && (
  <div className="border-t border-gray-700 p-3 md:p-4">
    {/* Conteúdo que aparece ao expandir */}
  </div>
)}
```

### Badges de Status

#### Badge de Status Ativo
```tsx
<span className="px-1.5 md:px-2 py-0.5 rounded-full text-xs bg-orange-900/50 text-orange-300 border border-orange-700">
  Ativo
</span>
```

#### Badge de Status Inativo
```tsx
<span className="px-1.5 md:px-2 py-0.5 rounded-full text-xs bg-gray-800 text-gray-400 border border-gray-700">
  Inativo
</span>
```

### Layout

#### Grid para Formulários (2 colunas em desktop)
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
  <div>{/* Campo 1 */}</div>
  <div>{/* Campo 2 */}</div>
</div>
```

#### Container com Espaçamento Vertical para Formulários
```tsx
<div className="space-y-4 md:space-y-6">
  <div>{/* Elemento do formulário */}</div>
  <div>{/* Próximo elemento */}</div>
</div>
```

## Guia de Estilos

### Cores

#### Backgrounds
- **Fundo de cartão padrão**: `bg-black/30`
- **Fundo de cartão destacado**: `bg-black/70 backdrop-blur-sm`
- **Fundo de cartão interno/inputs**: `bg-black/40` 
- **Fundo de botão principal**: `bg-orange-500`
- **Fundo de botão secundário**: `bg-gray-800`
- **Fundo de botão negativo**: `bg-red-600`
- **Fundo de mensagem de erro**: `bg-red-900/50`
- **Fundo de mensagem de sucesso**: `bg-green-900/50`

#### Bordas
- **Bordas padrão (cartões)**: `border-gray-700` 
- **Bordas cartões destacados**: `border-orange-700`
- **Bordas padrão (inputs)**: `border-gray-600`
- **Bordas de mensagem de erro**: `border-red-500`
- **Bordas de mensagem de sucesso**: `border-green-500`
- **Bordas badge ativo**: `border-orange-700`
- **Bordas badge inativo**: `border-gray-700`

#### Texto
- **Texto principal**: `text-white` ou `text-gray-300`
- **Texto de títulos/destaque**: `text-orange-400`
- **Texto secundário/ajuda**: `text-gray-400`
- **Texto em botão principal**: `text-white`
- **Texto em botão secundário**: `text-gray-100`
- **Texto badge ativo**: `text-orange-300`
- **Texto badge inativo**: `text-gray-400`

### Tipografia

- **Texto normal**: `text-sm`
- **Títulos grandes**: `text-lg md:text-xl`
- **Títulos de seção**: `text-base font-bold`
- **Labels de formulário**: `text-sm font-semibold`
- **Texto de ajuda**: `text-xs`
- **Texto em botões principais**: `text-sm font-semibold`
- **Texto em botões secundários**: `text-xs font-semibold`

### Espaçamento

- **Padding de cartão**: `p-4 md:p-6`
- **Padding de input**: `px-3 py-2`
- **Padding de botão principal**: `px-4 py-2`
- **Padding de botão secundário**: `px-2 md:px-3 py-1.5`
- **Margem entre elementos**: `space-y-4 md:space-y-6`
- **Margem antes de novo cartão**: `mb-6 md:mb-10`
- **Margem após label**: `mb-1`
- **Margem após inputs para texto de ajuda**: `mt-1`

### Bordas e Cantos

- **Cantos de cartões**: `rounded-xl`
- **Cantos de inputs/botões principais**: `rounded-lg` 
- **Cantos de botões secundários**: `rounded-md`
- **Cantos de badges/tags**: `rounded-full`

## Prompt para Adaptação de Componentes

```
Preciso que você adapte o componente [NOME_DO_COMPONENTE] para seguir o padrão visual do Gate33. Por favor, siga estas diretrizes:

1. Substitua todos os elementos visuais pelo padrão Gate33, mantendo a funcionalidade original do componente.

2. Use os seguintes padrões para cada tipo de elemento:

   - **Cartões e contêineres**: 
     - Padrão: Fundo preto semi-transparente (bg-black/30), bordas cinza (border-gray-700), cantos arredondados (rounded-xl) e padding responsivo (p-4 md:p-6)
     - Destacado: Fundo preto mais escuro (bg-black/70), bordas laranja (border-orange-700), cantos arredondados (rounded-xl), padding responsivo (p-4 md:p-6) e efeito blur (backdrop-blur-sm)
   
   - **Formulários**: 
     - Labels com fonte semi-bold, texto cinza claro (text-sm font-semibold text-gray-300)
     - Inputs com fundo preto semi-transparente (bg-black/40), bordas cinza (border-gray-600) 
     - Focus com anel laranja (focus:ring-2 focus:ring-orange-400)
     - Texto de ajuda pequeno e cinza (text-xs text-gray-400)
   
   - **Botões**: 
     - Principal: fundo laranja (bg-orange-500) com hover mais escuro (hover:bg-orange-600)
     - Secundário: fundo cinza escuro (bg-gray-800) com hover (hover:bg-gray-700)
     - Negativo: fundo vermelho (bg-red-600) com hover (hover:bg-red-700)
   
   - **Mensagens**: 
     - Erro: fundo vermelho transparente (bg-red-900/50) com borda vermelha (border-red-500)
     - Sucesso: fundo verde transparente (bg-green-900/50) com borda verde (border-green-500)
   
   - **Tipografia**:
     - Títulos em laranja (text-orange-400)
     - Texto normal em cinza claro (text-gray-300)
     - Texto secundário em cinza médio (text-gray-400)

3. Mantenha a mesma estrutura lógica e funcionalidades, alterando apenas o estilo visual.

4. Garanta que o componente seja completamente responsivo seguindo os padrões do Gate33.

5. Não use importações de componentes de estilo, aplique diretamente as classes Tailwind conforme o guia.
```

Use este prompt quando precisar adaptar qualquer componente para o padrão visual do Gate33 sem depender de importações dos componentes estilizados.

todas as directrizes estao em C:\Users\ventu\visual studio\gate33 newage\docs\Gate33_UI_Components_Guide.md