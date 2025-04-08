import { useQueryClient } from '@tanstack/react-query'

const useRefetch = () => {
  const querytClient = useQueryClient()
  return async () => {
    await querytClient.refetchQueries({
        type: 'active',
    })
  }
}

export default useRefetch