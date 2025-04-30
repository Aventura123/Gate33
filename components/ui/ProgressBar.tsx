import React, { useEffect, useRef } from 'react';

// Este é um componente dedicado para a barra de progresso
// que atualiza o CSS personalizado em vez de usar estilos inline
const ProgressBar = ({ percentage }: { percentage: number }) => {
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Atualiza a variável CSS para controlar a largura
    if (progressBarRef.current) {
      progressBarRef.current.style.setProperty('--progress-width', `${percentage}%`);
    }
  }, [percentage]);
  
  return (
    <div className="progress-bar">
      <div 
        ref={progressBarRef} 
        className="progress-bar-fill"
      />
    </div>
  );
};

export default ProgressBar;