import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import styled, { css } from 'styled-components'
import { useAccount } from 'wagmi'

import { Button } from '@ensdomains/thorin'

import { CacheableComponent } from '@app/components/@atoms/CacheableComponent'
import { ProfileSnippet } from '@app/components/ProfileSnippet'
import { NameSnippet } from '@app/components/pages/profile/NameSnippet'
import { ProfileDetails } from '@app/components/pages/profile/ProfileDetails'
import { WrapperCallToAction } from '@app/components/pages/profile/[name]/details/WrapperCallToAction'
import { useRecentTransactions } from '@app/hooks/transactions/useRecentTransactions'
import { useChainId } from '@app/hooks/useChainId'
import { useNameDetails } from '@app/hooks/useNameDetails'
import { useProfileActions } from '@app/hooks/useProfileActions'
import { useProtectedRoute } from '@app/hooks/useProtectedRoute'
import { useSelfAbilities } from '@app/hooks/useSelfAbilities'
import { Content } from '@app/layouts/Content'
import { useTransactionFlow } from '@app/transaction-flow/TransactionFlowProvider'
import { useBreakpoint } from '@app/utils/BreakpointProvider'

import { shouldShowSuccessPage } from '../../import/[name]/shared'

const DetailsWrapper = styled.div(
  ({ theme }) => css`
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: ${theme.space['2']};
    flex-gap: ${theme.space['2']};
    width: 100%;
  `,
)

const SelfButtons = styled(CacheableComponent)(
  ({ theme }) => css`
    display: flex;
    flex-direction: row;
    gap: ${theme.space['2']};
    flex-gap: ${theme.space['2']};

    & > button {
      border-radius: ${theme.radii.extraLarge};
      border: ${theme.space.px} solid ${theme.colors.borderTertiary};
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.02);
      background-color: ${theme.colors.background};
    }
  `,
)

type Props = {
  nameDetails: ReturnType<typeof useNameDetails>
  isSelf: boolean
  isLoading: boolean
  name: string
}

const ProfileContent = ({ nameDetails, isSelf, isLoading, name }: Props) => {
  const router = useRouter()
  const { t } = useTranslation('profile')
  const breakpoints = useBreakpoint()
  const chainId = useChainId()
  const { address } = useAccount()
  const transactions = useRecentTransactions()

  const {
    error,
    profile,
    ownerData,
    expiryDate,
    normalisedName,
    dnsOwner,
    valid,
    basicIsCachedData,
    profileIsCachedData,
    wrapperData,
    canBeWrapped,
  } = nameDetails

  const selfAbilities = useSelfAbilities(address, ownerData, name)
  const _canBeWrapped =
    canBeWrapped &&
    (ownerData?.ownershipLevel === 'registrar'
      ? ownerData?.registrant === address
      : ownerData?.owner === address)

  useProtectedRoute(
    '/',
    // When anything is loading, return true
    isLoading
      ? true
      : // if is self, user must be connected
        (isSelf ? address : true) && typeof name === 'string' && name.length > 0,
  )

  useEffect(() => {
    if (isSelf && name) {
      router.replace(`/profile/${name}`)
    }
  }, [isSelf, name, router])

  const getTextRecord = (key: string) => profile?.records?.texts?.find((x) => x.key === key)

  const [titleContent, descriptionContent] = useMemo(() => {
    if (isSelf) {
      return [t('yourProfile'), '']
    }
    if (normalisedName) {
      return [
        t('meta.title', {
          name: normalisedName,
        }),
        t('meta.description', {
          name: normalisedName,
        }),
      ]
    }
    if (typeof valid === 'boolean' && valid === false) {
      return [t('errors.invalidName'), t('errors.invalidName')]
    }
    return [
      t('meta.title', {
        name,
      }),
      t('meta.description', {
        name,
      }),
    ]
  }, [isSelf, normalisedName, valid, name, t])

  const { showDataInput } = useTransactionFlow()
  const handleEditProfile = () => {
    showDataInput(
      `edit-profile-${name}`,
      'ProfileEditor',
      { name },
      { disableBackgroundClick: true },
    )
  }

  const { profileActions } = useProfileActions()

  useEffect(() => {
    if (shouldShowSuccessPage(transactions)) {
      router.push(`/import/${name}`)
    }
  }, [name, router, transactions])

  return (
    <>
      <Head>
        <title>{titleContent}</title>
        <meta name="description" content={descriptionContent} />
      </Head>
      <Content
        noTitle
        title={isSelf ? t('yourProfile') : normalisedName}
        subtitle={isSelf ? normalisedName : 'Profile'}
        loading={isLoading}
      >
        {{
          info: _canBeWrapped && <WrapperCallToAction name={normalisedName} />,
          warning: error
            ? {
                type: 'warning',
                message: error,
              }
            : undefined,
          leading: breakpoints.md && ownerData && (
            <NameSnippet
              wrapperData={wrapperData!}
              name={normalisedName}
              network={chainId}
              ownerData={ownerData}
              expiryDate={expiryDate}
              showButton={!selfAbilities.canEdit}
              dnsOwner={dnsOwner}
              isCached={basicIsCachedData}
            />
          ),
          trailing: (
            <DetailsWrapper>
              <ProfileSnippet
                name={normalisedName}
                network={chainId}
                getTextRecord={getTextRecord}
                button={selfAbilities.canExtend ? 'extend' : undefined}
                canEdit={selfAbilities.canEdit}
                size={breakpoints.md ? 'medium' : 'small'}
                actions={profileActions}
              />
              {/* eslint-disable no-nested-ternary */}
              {selfAbilities.canEdit ? (
                <SelfButtons $isCached={profileIsCachedData}>
                  <Button shadowless variant="transparent" size="small" onClick={handleEditProfile}>
                    {t('editProfile')}
                  </Button>
                  <Button
                    onClick={() =>
                      router.push({
                        pathname: `/profile/${normalisedName}/details`,
                        query: {
                          from: router.asPath,
                        },
                      })
                    }
                    shadowless
                    variant="transparent"
                    size="small"
                  >
                    {t('viewDetails')}
                  </Button>
                </SelfButtons>
              ) : !breakpoints.md ? (
                <SelfButtons>
                  <Button
                    onClick={() =>
                      router.push({
                        pathname: `/profile/${normalisedName}/details`,
                        query: {
                          from: router.asPath,
                        },
                      })
                    }
                    shadowless
                    variant="transparent"
                    size="small"
                  >
                    {t('viewDetails')}
                  </Button>
                </SelfButtons>
              ) : null}
              {/* eslint-enable no-nested-ternary */}
              <ProfileDetails
                isCached={profileIsCachedData}
                addresses={(profile?.records?.coinTypes || []).map((item: any) => ({
                  key: item.coin,
                  value: item.addr,
                }))}
                textRecords={(profile?.records?.texts || [])
                  .map((item: any) => ({ key: item.key, value: item.value }))
                  .filter((item: any) => item.value !== null)}
              />
            </DetailsWrapper>
          ),
        }}
      </Content>
    </>
  )
}

export default ProfileContent
