import { useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useStockAdjustments } from '../hooks/useStockAdjustments';
import { githubDataManager } from '../services/githubDataManager';
import { Container } from '../services/github/types';

export default function StockRecoveryHelper() {
  const { products } = useProducts();
  const { createStockAdjustment } = useStockAdjustments();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{
    affectedContainers: Array<{
      id: string;
      containerNumber: string;
      status: string;
      hasQuantityRecord: boolean;
      products: Array<{ productId: string; productName: string; quantity: number }>;
    }>;
  } | null>(null);

  const analyzeContainers = () => {
    setIsAnalyzing(true);
    try {
      const containers = githubDataManager.getData('containers') as Container[];

      const affectedContainers = containers
        .filter(c =>
          c.containerStatus === 'closed' &&
          (!c.quantityAddedToStock || Object.keys(c.quantityAddedToStock).length === 0)
        )
        .map(c => ({
          id: c.id,
          containerNumber: c.containerNumber,
          status: c.containerStatus,
          hasQuantityRecord: !!c.quantityAddedToStock && Object.keys(c.quantityAddedToStock).length > 0,
          products: c.products.map(p => ({
            productId: p.productId,
            productName: p.productName,
            quantity: p.quantityBags,
          })),
        }));

      setAnalysis({ affectedContainers });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCorrectStock = async (containerId: string, productId: string, productName: string, quantityToRemove: number) => {
    const result = await createStockAdjustment({
      productId,
      productName,
      adjustmentType: 'correction',
      quantityChange: -quantityToRemove,
      reason: `Correction: Duplicate stock from container edit (Container: ${containerId})`,
    });

    if (result.success) {
      alert(`Successfully removed ${quantityToRemove} bags from ${productName}`);
      // Re-analyze
      analyzeContainers();
    } else {
      alert(`Failed: ${result.error}`);
    }
  };

  const handleMarkContainerProcessed = async (containerId: string) => {
    try {
      const containers = githubDataManager.getData('containers') as Container[];
      const container = containers.find(c => c.id === containerId);

      if (!container) {
        alert('Container not found');
        return;
      }

      // Mark container as processed by setting empty quantityAddedToStock
      const updatedContainers = containers.map(c =>
        c.id === containerId
          ? { ...c, quantityAddedToStock: {}, updatedAt: new Date().toISOString() }
          : c
      );

      await githubDataManager.updateData('containers', updatedContainers);
      alert('Container marked as processed');
      analyzeContainers();
    } catch (error: any) {
      alert(`Failed: ${error.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-creed-text-bright mb-1">Stock Recovery Helper</h1>
          <p className="text-creed-muted">Identify and fix duplicate stock from container edits</p>
        </div>
      </div>

      {/* Instructions */}
      <div className="backdrop-blur-sm rounded-lg border p-6" style={{
        backgroundColor: '#1a2129',
        borderColor: '#ef4444',
        borderWidth: '1px'
      }}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-creed-danger flex-shrink-0 mt-0.5" />
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-creed-text-bright">How to Use This Tool</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-creed-text">
              <li>Click "Analyze Containers" to find containers that may have caused duplicate stock</li>
              <li>Review the list of closed containers without quantity tracking</li>
              <li>For each product in each container, decide if stock was duplicated</li>
              <li>Use "Remove Duplicate Stock" to create a correction adjustment</li>
              <li>After fixing all duplicates, use "Mark as Processed" to prevent future issues</li>
            </ol>
            <p className="text-xs text-creed-muted">
              Note: This tool identifies containers that are "closed" but don't have quantity tracking records.
              These are containers that may have had stock added twice due to the recent bug.
            </p>
          </div>
        </div>
      </div>

      {/* Analyze Button */}
      <button
        onClick={analyzeContainers}
        disabled={isAnalyzing}
        className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all border hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: '#0c4a6e',
          borderColor: '#0284c7',
          color: '#fff'
        }}
      >
        <RefreshCw className={`w-5 h-5 ${isAnalyzing ? 'animate-spin' : ''}`} />
        {isAnalyzing ? 'Analyzing...' : 'Analyze Containers'}
      </button>

      {/* Results */}
      {analysis && (
        <div className="space-y-4">
          {analysis.affectedContainers.length === 0 ? (
            <div className="backdrop-blur-sm rounded-lg border p-8 text-center" style={{
              backgroundColor: '#1a2129',
              borderColor: '#2d3748',
              borderWidth: '1px'
            }}>
              <p className="text-creed-accent font-semibold text-lg">All Clear!</p>
              <p className="text-creed-muted mt-2">No containers found with potential duplicate stock issues.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="backdrop-blur-sm rounded-lg border p-4" style={{
                backgroundColor: '#1a2129',
                borderColor: '#ef4444',
                borderWidth: '1px'
              }}>
                <p className="text-creed-text font-semibold">
                  Found {analysis.affectedContainers.length} container(s) that may have caused duplicate stock
                </p>
              </div>

              {analysis.affectedContainers.map((container) => (
                <div
                  key={container.id}
                  className="backdrop-blur-sm rounded-lg border p-6 space-y-4"
                  style={{
                    backgroundColor: '#1a2129',
                    borderColor: '#2d3748',
                    borderWidth: '1px'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-creed-text-bright">
                        Container: {container.containerNumber}
                      </h3>
                      <p className="text-sm text-creed-muted">Status: {container.status}</p>
                    </div>
                    <button
                      onClick={() => handleMarkContainerProcessed(container.id)}
                      className="px-4 py-2 rounded-lg font-medium text-sm transition-all border hover:shadow-md"
                      style={{
                        backgroundColor: '#0c4a6e',
                        borderColor: '#0284c7',
                        color: '#fff'
                      }}
                    >
                      Mark as Processed
                    </button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-creed-text">Products in this container:</p>
                    {container.products.map((product) => {
                      const currentProduct = products.find(p => p.id === product.productId);
                      return (
                        <div
                          key={product.productId}
                          className="flex items-center justify-between p-3 rounded-lg border"
                          style={{
                            backgroundColor: '#151a21',
                            borderColor: '#2d3748',
                            borderWidth: '1px'
                          }}
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-creed-text">{product.productName}</p>
                            <p className="text-xs text-creed-muted">
                              Container quantity: {product.quantity} bags
                              {currentProduct && (
                                <span className="ml-3">Current stock: {currentProduct.quantity} bags</span>
                              )}
                            </p>
                          </div>
                          <button
                            onClick={() => handleCorrectStock(container.id, product.productId, product.productName, product.quantity)}
                            className="px-4 py-2 rounded-lg font-medium text-sm transition-all border hover:shadow-md"
                            style={{
                              backgroundColor: '#7f1d1d',
                              borderColor: '#ef4444',
                              color: '#fff'
                            }}
                          >
                            Remove {product.quantity} Bags
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
