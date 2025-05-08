export const CONTAINER_VARIANTS = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };
  
  export const ITEM_VARIANTS = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 }
    }
  };
  
  export const STATUS_BUTTON_VARIANTS = {
    inactive: { scale: 1, backgroundColor: '#374151' },
    active: { 
      scale: 1.05, 
      transition: { type: 'spring', stiffness: 400, damping: 15 } 
    }
  };