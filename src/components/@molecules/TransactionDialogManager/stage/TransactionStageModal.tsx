import PaperPlaneColourSVG from '@app/assets/PaperPlaneColour.svg'
import { Spacer } from '@app/components/@atoms/Spacer'
import { Outlink, StyledAnchor } from '@app/components/Outlink'
import { useChainName } from '@app/hooks/useChainName'
import { getRoute } from '@app/routes'
import { transactions } from '@app/transaction-flow/transaction'
import { ManagedDialogProps } from '@app/transaction-flow/types'
import { useEns } from '@app/utils/EnsProvider'
import { makeEtherscanLink } from '@app/utils/utils'
import { Button, Dialog, mq, Spinner, Typography } from '@ensdomains/thorin'
import type { JsonRpcSigner } from '@ethersproject/providers'
import { useAddRecentTransaction, useRecentTransactions } from '@rainbow-me/rainbowkit'
import { PopulatedTransaction } from 'ethers'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import styled, { css } from 'styled-components'
import { useSigner } from 'wagmi'
import { DisplayItems } from '../DisplayItems'

const InnerDialog = styled.div(
  ({ theme }) => css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    width: ${theme.space.full};
    padding: 0 ${theme.space['5']};
    gap: ${theme.space['4']};
    max-height: 60vh;
    overflow-y: auto;
    ${mq.sm.min(css`
      min-width: ${theme.space['128']};
    `)}
  `,
)

const ButtonShrinkwrap = styled(Button)(
  () => css`
    width: 80%;
    flex-shrink: 1;
    ${mq.md.min(css`
      width: 100%;
    `)}
  `,
)

const WaitingContainer = styled.div(
  ({ theme }) => css`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: ${theme.space['3']};
  `,
)

const WaitingTextContainer = styled.div(
  ({ theme }) => css`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    text-align: left;
    color: ${theme.colors.textSecondary};
  `,
)

const StyledSpinner = styled(Spinner)(
  ({ theme }) => css`
    width: ${theme.space['9']};
    height: ${theme.space['9']};
  `,
)

const WaitingElement = () => {
  const { t } = useTranslation()

  return (
    <WaitingContainer data-testid="transaction-waiting-container">
      <StyledSpinner color="accent" />
      <WaitingTextContainer>
        <Typography weight="bold">{t('transaction.dialog.confirm.waiting.title')}</Typography>
        <Typography>{t('transaction.dialog.confirm.waiting.subtitle')}</Typography>
      </WaitingTextContainer>
    </WaitingContainer>
  )
}

const Seconds = styled(Typography)(
  ({ theme }) => css`
    margin: 0 ${theme.space['1']};
  `,
)

const Container = styled.div(
  () => css`
    display: flex;
    align-items: center;
  `,
)

const WaitingElementMining = ({ txHash }: { txHash: string | null }) => {
  const recentTransactions = useRecentTransactions()
  const { t } = useTranslation()

  const { data: estimatedTime } = useQuery(['estimatedTransactionTime', txHash], async () => {
    const tx = recentTransactions.find((transaction) => transaction.hash === txHash)
    const gasPrice = tx && JSON.parse(tx.description).gasPrice
    const response = await global.fetch(`https://confirmation-time.ens-cf.workers.dev/${gasPrice}`)
    if (response.ok) {
      const estimation: { result: string } = await response.json()
      return estimation.result
    }
  })

  return (
    <WaitingContainer data-testid="transaction-waiting-container">
      <StyledSpinner color="accent" />
      <WaitingTextContainer>
        <Typography weight="bold">{t('transaction.dialog.mining.title')}</Typography>
        {estimatedTime && (
          <Container>
            <Typography>{t('transaction.dialog.mining.estimationPre')}</Typography>
            <Seconds {...{ weight: 'bold', color: 'green' }}>{`${estimatedTime}`}</Seconds>
            <Typography>{t('transaction.dialog.mining.estimationPost')}</Typography>
          </Container>
        )}
      </WaitingTextContainer>
    </WaitingContainer>
  )
}

const ErrorTypography = styled(Typography)(
  () => css`
    width: 100%;
    text-align: center;
  `,
)

const SuccessContent = styled.div(
  ({ theme }) => css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${theme.space['2']};
    text-align: center;
  `,
)

const CompleteTypography = styled(Typography)(
  ({ theme }) => css`
    max-width: ${theme.space['80']};
  `,
)

type Stage = 'request' | 'confirm' | 'mining' | 'complete'

export const TransactionStageModal = ({
  displayItems,
  onDismiss,
  onSuccess,
  transaction,
  actionName,
  completeTitle,
  dismissBtnLabel,
  completeBtnLabel,
  currentStep,
  stepCount,
  onComplete,
  txKey,
}: ManagedDialogProps & {
  txKey: string | null
  currentStep: number
  stepCount: number
  onComplete: () => void
}) => {
  const { t } = useTranslation()
  const chainName = useChainName()
  const router = useRouter()

  const addTransaction = useAddRecentTransaction()
  const recentTransactions = useRecentTransactions()
  const { data: signer } = useSigner()
  const ens = useEns()

  const [stage, setStage] = useState<Stage>('request')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const settingsRoute = getRoute('settings')

  useEffect(() => {
    const tx = recentTransactions.find((trx) => trx.hash === txHash)
    if (tx?.status === 'confirmed') {
      setStage('complete')
      onComplete()
    }
  }, [recentTransactions, onComplete, txHash])

  const { data: populatedTransaction } = useQuery(
    ['tx', txKey, currentStep],
    async () => {
      let _populatedTransaction: PopulatedTransaction

      try {
        _populatedTransaction = await transactions[transaction.name].transaction(
          signer as JsonRpcSigner,
          ens,
          transaction.data,
        )
        _populatedTransaction.gasLimit = await signer!.estimateGas(_populatedTransaction)
        return _populatedTransaction
      } catch (e: any) {
        setError(e.message || e)
        return null
      }
    },
    {
      enabled: !!transaction && !!signer && !!ens,
    },
  )

  const tryTransaction = useCallback(async () => {
    setError(null)
    try {
      const { hash, gasPrice } = await (signer as JsonRpcSigner).sendTransaction(
        populatedTransaction!,
      )
      if (!hash) throw new Error('No transaction generated')
      addTransaction({
        description: JSON.stringify({
          action: actionName,
          key: txKey,
          gasPrice: gasPrice?.toNumber(),
        }),
        hash,
      })
      setTxHash(hash)
      setStage('mining')
    } catch (e: any) {
      if (e && e.code === 4001) {
        setError('transaction.dialog.confirm.error.rejectedRequest')
      } else {
        setError(e ? e.message : 'transaction.dialog.confirm.error.unknown')
      }
    }
  }, [addTransaction, actionName, txKey, signer, populatedTransaction])

  const FilledDisplayItems = useMemo(
    () => (
      <DisplayItems
        displayItems={[
          {
            label: 'action',
            value: t(`transaction.description.${actionName}`),
          },
          {
            label: 'info',
            value: t(`transaction.info.${actionName}`),
          },
          ...(displayItems || []),
        ]}
      />
    ),
    [t, actionName, displayItems],
  )
  const MiddleContent = useMemo(() => {
    if (stage === 'mining') {
      return (
        <SuccessContent>
          <WaitingElementMining {...{ txHash }} />
          <Spacer $height="1" />
          <Typography>{t('transaction.dialog.mining.message')}</Typography>
        </SuccessContent>
      )
    }
    if (stage === 'complete') {
      return (
        <SuccessContent>
          <PaperPlaneColourSVG />
          <CompleteTypography>{t('transaction.dialog.complete.message')}</CompleteTypography>
          <StyledAnchor
            onClick={() => {
              onDismiss?.()
              router.push(settingsRoute.href)
            }}
          >
            {t('transaction.dialog.complete.viewTransactions')}
          </StyledAnchor>
        </SuccessContent>
      )
    }
    if (stage === 'confirm') {
      return <WaitingElement />
    }
    return null
  }, [onDismiss, router, settingsRoute.href, stage, t, txHash])

  const LeadingButton = useMemo(() => {
    let label: string
    if (stage === 'mining') return null
    if (stage === 'complete') {
      if (currentStep + 1 === stepCount) return null
      label = t('action.close')
    } else if (dismissBtnLabel) {
      label = dismissBtnLabel
    } else {
      label = t('action.cancel')
    }
    return (
      <ButtonShrinkwrap
        onClick={() => {
          if (stage === 'complete') onSuccess?.()
          onDismiss?.()
        }}
        variant="secondary"
        tone="grey"
        shadowless
        data-testid="transaction-modal-dismiss-btn"
      >
        {label}
      </ButtonShrinkwrap>
    )
  }, [stage, dismissBtnLabel, currentStep, stepCount, t, onDismiss, onSuccess])

  const TrailingButton = useMemo(() => {
    const final = currentStep + 1 === stepCount
    if (stage === 'complete') {
      return (
        <Button
          variant={final ? 'secondary' : 'primary'}
          shadowless
          onClick={() => {
            onSuccess?.()
            if (final) onDismiss?.()
          }}
          data-testid="transaction-modal-complete-trailing-btn"
        >
          {completeBtnLabel ||
            (final
              ? t('transaction.dialog.complete.trailingButton')
              : t('transaction.dialog.complete.stepTrailingButton'))}
        </Button>
      )
    }
    if (stage === 'confirm') {
      return (
        <Button
          disabled={!error}
          shadowless
          variant="secondary"
          onClick={() => {
            tryTransaction()
          }}
          data-testid="transaction-modal-confirm-trailing-btn"
        >
          {t('transaction.dialog.confirm.trailingButton')}
        </Button>
      )
    }
    if (stage === 'mining') {
      return (
        <Button
          shadowless
          variant="primary"
          onClick={() => {
            onSuccess?.()
            if (final) onDismiss?.()
          }}
          data-testid="transaction-modal-confirm-trailing-btn"
        >
          {t('transaction.dialog.mining.trailingButton')}
        </Button>
      )
    }
    return (
      <Button
        data-testid="transaction-modal-request-trailing-btn"
        shadowless
        onClick={() => {
          setStage('confirm')
        }}
        disabled={!populatedTransaction}
      >
        {t('transaction.dialog.request.trailingButton')}
      </Button>
    )
  }, [
    stage,
    populatedTransaction,
    t,
    currentStep,
    stepCount,
    completeBtnLabel,
    onSuccess,
    onDismiss,
    error,
    tryTransaction,
  ])

  const title = useMemo(() => {
    if (stage === 'complete') {
      if (stepCount > 1) {
        return (
          completeTitle || t('transaction.dialog.complete.stepTitle', { step: currentStep + 1 })
        )
      }
      return completeTitle || t('transaction.dialog.complete.title')
    }
    if (stage === 'confirm') {
      return t('transaction.dialog.confirm.title')
    }
    return t('transaction.dialog.request.title')
  }, [completeTitle, currentStep, stage, stepCount, t])

  useEffect(() => {
    setStage('request')
    setError(null)
    setTxHash(null)
  }, [])

  useEffect(() => {
    if (stage === 'confirm') {
      tryTransaction()
    }
  }, [stage, tryTransaction])

  const stepStatus = useMemo(() => {
    if (stage === 'complete') {
      return 'completed'
    }
    return 'inProgress'
  }, [stage])

  return (
    <>
      <Dialog.Heading
        title={title}
        subtitle={stage === 'request' ? t('transaction.dialog.request.subtitle') : undefined}
        currentStep={currentStep}
        stepCount={stepCount > 1 ? stepCount : undefined}
        stepStatus={stepStatus}
      />
      <InnerDialog data-testid="transaction-modal-inner">
        {error ? <ErrorTypography color="red">{t(error)}</ErrorTypography> : MiddleContent}
        {FilledDisplayItems}
      </InnerDialog>
      {(stage === 'complete' || stage === 'mining') && (
        <Outlink href={makeEtherscanLink(txHash!, chainName)}>
          {t('transaction.viewEtherscan')}
        </Outlink>
      )}
      <Dialog.Footer leading={LeadingButton} trailing={TrailingButton} />
    </>
  )
}
